import "server-only";
import { prisma } from "@/lib/prisma";

export interface ProductOption {
  id: string;
  name: string;
  basePrice: number;
}

/** Lightweight list of active products for admin pickers (flash sale, etc.). */
export async function getProductOptions(): Promise<ProductOption[]> {
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, basePrice: true },
  });
}
