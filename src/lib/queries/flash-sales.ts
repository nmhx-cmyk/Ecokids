import "server-only";
import { prisma } from "@/lib/prisma";
import type { ProductCardData } from "@/components/storefront/ProductCard";

/** Map of productId -> lowest active flash-sale price (only currently-running sales). */
export async function getActiveFlashPriceMap(
  productIds: string[],
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const now = new Date();
  const items = await prisma.flashSaleItem.findMany({
    where: {
      productId: { in: productIds },
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    select: { productId: true, salePrice: true },
  });

  const map = new Map<string, number>();
  for (const item of items) {
    const current = map.get(item.productId);
    if (current === undefined || item.salePrice < current) {
      map.set(item.productId, item.salePrice);
    }
  }
  return map;
}

/** Active flash sale for a single product (lowest price), with its end time. */
export async function getActiveFlashForProduct(
  productId: string,
): Promise<{ salePrice: number; endsAt: Date } | null> {
  const now = new Date();
  const items = await prisma.flashSaleItem.findMany({
    where: {
      productId,
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    select: { salePrice: true, flashSale: { select: { endsAt: true } } },
    orderBy: { salePrice: "asc" },
    take: 1,
  });
  const item = items[0];
  if (!item) return null;
  return { salePrice: item.salePrice, endsAt: item.flashSale.endsAt };
}

/** Soonest end time among currently-running flash sales (for the homepage timer). */
export async function getNearestFlashSaleEnd(): Promise<Date | null> {
  const now = new Date();
  const sale = await prisma.flashSale.findFirst({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { endsAt: "asc" },
    select: { endsAt: true },
  });
  return sale?.endsAt ?? null;
}

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Active flash-sale products as cards, with sale price shown as the headline price. */
export async function getActiveFlashSaleProducts(
  limit = 8,
): Promise<ProductCardData[]> {
  const now = new Date();
  const items = await prisma.flashSaleItem.findMany({
    where: {
      flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      product: { status: "ACTIVE" },
    },
    take: limit,
    select: {
      salePrice: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          createdAt: true,
          ratingAvg: true,
          ratingCount: true,
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
          variants: { select: { stock: true } },
        },
      },
    },
  });

  return items.map((item) => {
    const p = item.product;
    const primary = p.images[0] ?? null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      basePrice: item.salePrice,
      comparePrice: p.basePrice > item.salePrice ? p.basePrice : null,
      primaryImage: primary ? { url: primary.url, alt: primary.alt } : null,
      isNew: Date.now() - p.createdAt.getTime() < NEW_WINDOW_MS,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
    } satisfies ProductCardData;
  });
}

// ============================================
// Admin
// ============================================

export interface AdminFlashSaleRow {
  id: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  itemCount: number;
  isRunning: boolean;
}

export async function getFlashSales(): Promise<AdminFlashSaleRow[]> {
  const now = new Date();
  const sales = await prisma.flashSale.findMany({
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      name: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      _count: { select: { items: true } },
    },
  });
  return sales.map((s) => ({
    id: s.id,
    name: s.name,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    isActive: s.isActive,
    itemCount: s._count.items,
    isRunning: s.isActive && s.startsAt <= now && s.endsAt >= now,
  }));
}

export async function getFlashSaleById(id: string) {
  return prisma.flashSale.findUnique({
    where: { id },
    include: {
      items: {
        select: {
          productId: true,
          salePrice: true,
          product: { select: { name: true, basePrice: true } },
        },
      },
    },
  });
}
