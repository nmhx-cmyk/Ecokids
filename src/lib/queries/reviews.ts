import "server-only";
import { Prisma, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  isVerified: boolean;
  authorName: string;
  adminReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** counts indexed 1..5 */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

function maskName(name: string | null, email: string): string {
  const base = name?.trim() || email.split("@")[0] || "Khách";
  if (base.length <= 2) return base;
  return `${base.slice(0, 1)}***${base.slice(-1)}`;
}

export async function getProductReviews(
  productId: string,
  { take = 20, skip = 0 }: { take?: number; skip?: number } = {},
): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { productId, status: ReviewStatus.APPROVED },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      images: true,
      isVerified: true,
      adminReply: true,
      repliedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    images: r.images,
    isVerified: r.isVerified,
    authorName: maskName(r.user.name, r.user.email),
    adminReply: r.adminReply,
    repliedAt: r.repliedAt,
    createdAt: r.createdAt,
  }));
}

export async function getReviewSummary(
  productId: string,
): Promise<ReviewSummary> {
  const grouped = await prisma.review.groupBy({
    by: ["rating"],
    where: { productId, status: ReviewStatus.APPROVED },
    _count: { _all: true },
  });

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let total = 0;
  let weighted = 0;
  for (const g of grouped) {
    const r = g.rating as 1 | 2 | 3 | 4 | 5;
    if (r >= 1 && r <= 5) {
      distribution[r] = g._count._all;
      total += g._count._all;
      weighted += r * g._count._all;
    }
  }

  return {
    average: total > 0 ? Math.round((weighted / total) * 10) / 10 : 0,
    count: total,
    distribution,
  };
}

export interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  status: ReviewStatus;
}

export async function getMyReviewForProduct(
  userId: string,
  productId: string,
): Promise<MyReview | null> {
  const review = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      images: true,
      status: true,
    },
  });
  return review;
}

// ============================================
// Admin moderation
// ============================================

export interface AdminReviewRow {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  images: string[];
  status: ReviewStatus;
  isVerified: boolean;
  adminReply: string | null;
  createdAt: Date;
  authorName: string;
  authorEmail: string;
  productName: string;
  productSlug: string;
}

export interface AdminReviewListResult {
  reviews: AdminReviewRow[];
  total: number;
  pendingCount: number;
}

export async function getAdminReviews({
  status,
  page = 1,
  pageSize = 20,
}: {
  status?: ReviewStatus;
  page?: number;
  pageSize?: number;
}): Promise<AdminReviewListResult> {
  const where: Prisma.ReviewWhereInput = status ? { status } : {};

  const [rows, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        images: true,
        status: true,
        isVerified: true,
        adminReply: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
  ]);

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      images: r.images,
      status: r.status,
      isVerified: r.isVerified,
      adminReply: r.adminReply,
      createdAt: r.createdAt,
      authorName: r.user.name?.trim() || r.user.email,
      authorEmail: r.user.email,
      productName: r.product.name,
      productSlug: r.product.slug,
    })),
    total,
    pendingCount,
  };
}
