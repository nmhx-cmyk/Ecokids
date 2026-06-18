import "server-only";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  toProductCardData,
  type ProductCardData,
} from "@/components/storefront/ProductCard";

export type ProductDetail = Prisma.ProductGetPayload<{
  include: {
    category: {
      select: {
        id: true;
        name: true;
        slug: true;
        parent: { select: { id: true; name: true; slug: true } };
      };
    };
    images: true;
    variants: true;
  };
}>;

export async function getProductDetailBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent: { select: { id: true, name: true, slug: true } },
        },
      },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: [{ size: "asc" }, { color: "asc" }] },
    },
  });

  if (!product || product.status !== ProductStatus.ACTIVE) {
    return null;
  }

  return product;
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      categoryId,
      id: { not: productId },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      comparePrice: true,
      createdAt: true,
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true, alt: true, isPrimary: true },
      },
      variants: { select: { stock: true } },
    },
  });

  return rows.map((row) => toProductCardData(row));
}
