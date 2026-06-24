import "server-only";
import { unstable_cache } from "next/cache";
import { AgeRange, Gender, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AGE_RANGE_LABELS } from "@/lib/constants/age-ranges";
import { GENDER_LABELS } from "@/lib/constants/gender";

export type StorefrontSort = "new" | "price_asc" | "price_desc" | "name_asc";

export interface SearchProductsParams {
  q?: string;
  categorySlug?: string;
  gender?: Gender;
  ageRanges?: AgeRange[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort?: StorefrontSort;
  page?: number;
  pageSize?: number;
}

export interface StorefrontProductListItem {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  ageRange: AgeRange[];
  gender: Gender;
  category: { slug: string; name: string } | null;
  primaryImage: { url: string; alt: string } | null;
  isNew: boolean;
  totalStock: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface SearchProductsResult {
  items: StorefrontProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function buildOrderBy(
  sort: StorefrontSort,
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { basePrice: "asc" };
    case "price_desc":
      return { basePrice: "desc" };
    case "name_asc":
      return { name: "asc" };
    case "new":
    default:
      return { createdAt: "desc" };
  }
}

async function resolveCategoryIds(categorySlug: string): Promise<string[]> {
  // Resolve slug → category (and any direct children, since GĐ1 is only 2 levels deep).
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: {
      id: true,
      children: { select: { id: true } },
    },
  });
  if (!category) return [];
  return [category.id, ...category.children.map((c) => c.id)];
}

// Cached per unique filter/sort/page combination for 60s (key includes the
// params object). Product mutations call revalidateTag("products") to refresh.
export const searchProducts = unstable_cache(
  async (
    params: SearchProductsParams = {},
  ): Promise<SearchProductsResult> => {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24));
  const sort: StorefrontSort = params.sort ?? "new";

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  // NOTE: Vietnamese diacritic-insensitive search would need raw Postgres `unaccent`
  // FTS. For the list page we keep Prisma `contains` (case-insensitive only); the
  // /api/search route uses tsvector + unaccent for the search modal.
  if (params.q && params.q.trim().length > 0) {
    const q = params.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.categorySlug) {
    const ids = await resolveCategoryIds(params.categorySlug);
    if (ids.length === 0) {
      // Unknown category → guaranteed empty result.
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
    }
    where.categoryId = { in: ids };
  }

  if (params.gender) {
    where.gender = params.gender;
  }

  if (params.ageRanges && params.ageRanges.length > 0) {
    where.ageRange = { hasSome: params.ageRanges };
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const range: Prisma.IntFilter = {};
    if (params.minPrice !== undefined) range.gte = params.minPrice;
    if (params.maxPrice !== undefined) range.lte = params.maxPrice;
    where.basePrice = range;
  }

  if (params.onSale) {
    where.comparePrice = { not: null };
  }

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        basePrice: true,
        comparePrice: true,
        ageRange: true,
        gender: true,
        createdAt: true,
        ratingAvg: true,
        ratingCount: true,
        category: { select: { slug: true, name: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true, alt: true },
        },
        variants: {
          select: { stock: true },
        },
      },
    }),
  ]);

  const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const items: StorefrontProductListItem[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    basePrice: row.basePrice,
    comparePrice: row.comparePrice,
    ageRange: row.ageRange,
    gender: row.gender,
    category: row.category
      ? { slug: row.category.slug, name: row.category.name }
      : null,
    primaryImage: row.images[0] ?? null,
    isNew: now - row.createdAt.getTime() < NEW_WINDOW_MS,
    totalStock: row.variants.reduce((sum, v) => sum + v.stock, 0),
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
  },
  ["product-search"],
  { revalidate: 60, tags: ["products"] },
);

export interface FilterCategoryNode {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  children: FilterCategoryNode[];
}

export interface FilterFacetOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterFacets {
  categoryTree: FilterCategoryNode[];
  genders: FilterFacetOption<Gender>[];
  ageRanges: FilterFacetOption<AgeRange>[];
  priceRange: { min: number; max: number };
}

export const getFilterFacets = unstable_cache(
  async (): Promise<FilterFacets> => {
  const [categories, priceAgg] = await Promise.all([
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        sortOrder: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.product.aggregate({
      where: { status: "ACTIVE" },
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  const byId = new Map<string, FilterCategoryNode & { parentId: string | null; sortOrder: number }>();
  for (const c of categories) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
      children: [],
      parentId: c.parentId,
      sortOrder: c.sortOrder,
    });
  }

  const roots: (FilterCategoryNode & { sortOrder: number })[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (
    nodes: (FilterCategoryNode & { sortOrder: number })[],
  ): FilterCategoryNode[] =>
    nodes
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, "vi");
      })
      .map((n) => ({
        id: n.id,
        name: n.name,
        slug: n.slug,
        productCount: n.productCount,
        children: sortNodes(
          n.children as (FilterCategoryNode & { sortOrder: number })[],
        ),
      }));

  const genders: FilterFacetOption<Gender>[] = (
    ["BOY", "GIRL", "UNISEX"] as const
  ).map((g) => ({ value: g, label: GENDER_LABELS[g] }));

  const ageRanges: FilterFacetOption<AgeRange>[] = (
    ["NEWBORN_0_1", "TODDLER_1_3", "KID_3_6", "KID_6_12"] as const
  ).map((a) => ({ value: a, label: AGE_RANGE_LABELS[a] }));

  return {
    categoryTree: sortNodes(roots),
    genders,
    ageRanges,
    priceRange: {
      min: priceAgg._min.basePrice ?? 0,
      max: priceAgg._max.basePrice ?? 0,
    },
  };
  },
  ["product-list-filter-facets"],
  { revalidate: 300, tags: ["products", "categories"] },
);
