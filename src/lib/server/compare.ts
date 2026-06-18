"use server";

import { prisma } from "@/lib/prisma";

export interface CompareProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  ratingAvg: number;
  ratingCount: number;
  material: string | null;
  origin: string | null;
  totalStock: number;
  primaryImage: { url: string; alt: string } | null;
}

/** Fetches active products for the comparison table, preserving the input order. */
export async function getCompareProducts(
  ids: string[],
): Promise<CompareProduct[]> {
  const clean = ids.filter(Boolean).slice(0, 4);
  if (clean.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: clean }, status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      comparePrice: true,
      ratingAvg: true,
      ratingCount: true,
      material: true,
      origin: true,
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true },
      },
      variants: { select: { stock: true } },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  return clean
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      basePrice: p.basePrice,
      comparePrice: p.comparePrice,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      material: p.material,
      origin: p.origin,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      primaryImage: p.images[0] ?? null,
    }));
}
