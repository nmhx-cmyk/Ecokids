import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  toProductCardData,
  type ProductCardData,
} from "@/components/storefront/ProductCard";

const WISHLIST_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  comparePrice: true,
  createdAt: true,
  ratingAvg: true,
  ratingCount: true,
  status: true,
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true, alt: true, isPrimary: true },
  },
  variants: { select: { stock: true } },
} satisfies Prisma.ProductSelect;

export async function getWishlist(userId: string): Promise<ProductCardData[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { product: { select: WISHLIST_PRODUCT_SELECT } },
  });

  // Hide products that are no longer active so the wishlist stays clean.
  return items
    .map((i) => i.product)
    .filter((p) => p.status === "ACTIVE")
    .map((p) => toProductCardData(p));
}
