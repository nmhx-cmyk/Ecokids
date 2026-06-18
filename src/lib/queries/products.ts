import "server-only";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProductSort = "newest" | "price-asc" | "price-desc";

export interface GetAdminProductsParams {
  search?: string;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
  sort?: ProductSort;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  status: ProductStatus;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  primaryImage: { url: string; alt: string } | null;
  variantCount: number;
  totalStock: number;
  minStock: number;
}

export interface GetAdminProductsResult {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function buildOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { basePrice: "asc" };
    case "price-desc":
      return { basePrice: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function getAdminProducts(
  params: GetAdminProductsParams = {},
): Promise<GetAdminProductsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const sort = params.sort ?? "newest";

  const where: Prisma.ProductWhereInput = {};
  if (params.status) {
    where.status = params.status;
  }
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
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
        status: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
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

  const items: AdminProductListItem[] = rows.map((row) => {
    const stocks = row.variants.map((v) => v.stock);
    const totalStock = stocks.reduce((sum, s) => sum + s, 0);
    const minStock = stocks.length > 0 ? Math.min(...stocks) : 0;
    const primaryImage = row.images[0] ?? null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      basePrice: row.basePrice,
      comparePrice: row.comparePrice,
      status: row.status,
      updatedAt: row.updatedAt,
      category: row.category ? { id: row.category.id, name: row.category.name } : null,
      primaryImage,
      variantCount: row.variants.length,
      totalStock,
      minStock,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages };
}

export type AdminProductDetail = Prisma.ProductGetPayload<{
  include: {
    images: true;
    variants: true;
    category: { select: { id: true; name: true; slug: true } };
  };
}>;

export async function getAdminProductById(
  id: string,
): Promise<AdminProductDetail | null> {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });
}
