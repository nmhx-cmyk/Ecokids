"use server";

import { revalidatePath } from "next/cache";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";

/** Product IDs in the current user's wishlist (empty array for guests). */
export async function getMyWishlistIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  return items.map((i) => i.productId);
}

export async function toggleWishlist(
  productId: string,
): Promise<ServerActionResult<{ active: boolean }>> {
  const user = await getCurrentUser();
  if (!user) {
    return err(ERROR_CODES.UNAUTHORIZED, "Vui lòng đăng nhập để dùng yêu thích");
  }
  if (!productId) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã sản phẩm");
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return ok({ active: false });
  }

  // Guard against wishlisting a non-existent product.
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy sản phẩm");
  }

  await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return ok({ active: true });
}

export async function removeFromWishlist(
  productId: string,
): Promise<ServerActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) {
    return err(ERROR_CODES.UNAUTHORIZED, "Vui lòng đăng nhập");
  }
  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId },
  });
  revalidatePath("/account/wishlist");
  return ok(null);
}
