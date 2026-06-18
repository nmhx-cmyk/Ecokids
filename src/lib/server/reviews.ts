"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ReviewStatus } from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  adminReplySchema,
  createReviewSchema,
  type AdminReplyInput,
  type CreateReviewInput,
} from "@/lib/validations/review";

function firstIssue(issues: { message: string; path: (string | number)[] }[]) {
  const issue = issues[0];
  return {
    message: issue?.message ?? "Dữ liệu không hợp lệ",
    field: issue?.path[0]?.toString(),
  };
}

/**
 * Recomputes the denormalized rating aggregates on Product from its APPROVED
 * reviews. Must run inside a transaction that also mutates the reviews.
 */
async function recomputeProductRating(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { productId, status: ReviewStatus.APPROVED },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  const avg = agg._avg.rating ?? 0;
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingCount: count,
      ratingAvg: count > 0 ? Math.round(avg * 10) / 10 : 0,
    },
  });
}

/** True if the user has a COMPLETED order containing this product. */
async function hasPurchased(
  userId: string,
  productId: string,
): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { userId, status: "COMPLETED" },
    },
    select: { id: true },
  });
  return item !== null;
}

export async function createReview(
  input: CreateReviewInput,
): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { id: true },
  });
  if (!product) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy sản phẩm");
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: user.id, productId: data.productId } },
    select: { id: true },
  });
  if (existing) {
    return err(
      ERROR_CODES.CONFLICT,
      "Bạn đã đánh giá sản phẩm này rồi. Hãy chỉnh sửa đánh giá cũ.",
    );
  }

  const isVerified = await hasPurchased(user.id, data.productId);

  const created = await prisma.review.create({
    data: {
      productId: data.productId,
      userId: user.id,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      images: data.images,
      isVerified,
      status: ReviewStatus.PENDING,
    },
    select: { id: true, product: { select: { slug: true } } },
  });

  revalidatePath(`/products/${created.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok({ id: created.id });
}

export async function updateReview(
  reviewId: string,
  input: CreateReviewInput,
): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, productId: true },
  });
  if (!review) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đánh giá");
  }
  if (review.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền sửa đánh giá này");
  }

  // Editing resets the review to PENDING so a moderator re-checks the new content.
  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: data.images,
        status: ReviewStatus.PENDING,
      },
    });
    await recomputeProductRating(tx, review.productId);
  });

  const product = await prisma.product.findUnique({
    where: { id: review.productId },
    select: { slug: true },
  });
  if (product) revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin/reviews");
  return ok({ id: reviewId });
}

export async function deleteReview(
  reviewId: string,
): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      userId: true,
      productId: true,
      product: { select: { slug: true } },
    },
  });
  if (!review) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đánh giá");
  }
  // Admin or the author can delete.
  if (review.userId !== user.id && user.role !== "ADMIN") {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền xoá đánh giá này");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recomputeProductRating(tx, review.productId);
  });

  revalidatePath(`/products/${review.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok({ id: reviewId });
}

export async function moderateReview(
  reviewId: string,
  status: "APPROVED" | "REJECTED",
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  if (status !== "APPROVED" && status !== "REJECTED") {
    return err(ERROR_CODES.VALIDATION, "Trạng thái không hợp lệ");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, product: { select: { slug: true } } },
  });
  if (!review) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đánh giá");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: reviewId },
      data: { status: status as ReviewStatus },
    });
    await recomputeProductRating(tx, review.productId);
  });

  revalidatePath(`/products/${review.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok({ id: reviewId });
}

export async function replyToReview(
  input: AdminReplyInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = adminReplySchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const review = await prisma.review.findUnique({
    where: { id: data.reviewId },
    select: { id: true, product: { select: { slug: true } } },
  });
  if (!review) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đánh giá");
  }

  await prisma.review.update({
    where: { id: data.reviewId },
    data: { adminReply: data.reply, repliedAt: new Date() },
  });

  revalidatePath(`/products/${review.product.slug}`);
  revalidatePath("/admin/reviews");
  return ok({ id: data.reviewId });
}
