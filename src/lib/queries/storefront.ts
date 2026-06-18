import "server-only";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  toProductCardData,
  type ProductCardData,
} from "@/components/storefront/ProductCard";

export interface FeaturedCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

const PRODUCT_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  comparePrice: true,
  createdAt: true,
  ratingAvg: true,
  ratingCount: true,
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, alt: true, isPrimary: true },
  },
  variants: {
    select: { stock: true },
  },
} satisfies Prisma.ProductSelect;

type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_CARD_SELECT;
}>;

function mapRows(rows: ProductCardRow[]): ProductCardData[] {
  return rows.map((row) => toProductCardData(row));
}

export async function getFeaturedCategories(
  limit = 4,
): Promise<FeaturedCategory[]> {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });

  const sorted = rows
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (b._count.products !== a._count.products) {
        return b._count.products - a._count.products;
      }
      return a.name.localeCompare(b.name, "vi");
    })
    .slice(0, limit);

  return sorted.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.imageUrl,
  }));
}

export async function getBestSellers(limit = 8): Promise<ProductCardData[]> {
  // GĐ1: placeholder ordering by createdAt desc.
  // Sprint 5 sẽ thay bằng order theo số lượng bán thực tế.
  const rows = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: PRODUCT_CARD_SELECT,
  });

  return mapRows(rows);
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: PRODUCT_CARD_SELECT,
  });

  return mapRows(rows);
}

export async function getSaleProducts(limit = 8): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      comparePrice: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: PRODUCT_CARD_SELECT,
  });

  return mapRows(rows);
}
