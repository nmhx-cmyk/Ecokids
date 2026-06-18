import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  productFindUnique,
  reviewFindUnique,
  reviewCreate,
  reviewUpdate,
  reviewAggregate,
  productUpdate,
  orderItemFindFirst,
  txn,
} = vi.hoisted(() => ({
  productFindUnique: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
  reviewUpdate: vi.fn(),
  reviewAggregate: vi.fn(),
  productUpdate: vi.fn(),
  orderItemFindFirst: vi.fn(),
  txn: vi.fn(),
}));

const { requireUser, requireAdmin } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findUnique: productFindUnique, update: productUpdate },
    review: {
      findUnique: reviewFindUnique,
      create: reviewCreate,
      update: reviewUpdate,
      aggregate: reviewAggregate,
    },
    orderItem: { findFirst: orderItemFindFirst },
    $transaction: txn,
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  requireUser,
  requireAdmin,
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createReview, moderateReview } from "../reviews";

const VALID = {
  productId: "p1",
  rating: 5,
  title: null,
  comment: "Sản phẩm rất đẹp và chất lượng tốt.",
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "u1", role: "USER" });
  requireAdmin.mockResolvedValue({ id: "admin", role: "ADMIN" });
  reviewAggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 2 } });
  txn.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      review: { update: reviewUpdate, aggregate: reviewAggregate },
      product: { update: productUpdate },
    }),
  );
});

describe("createReview", () => {
  it("rejects invalid input (comment too short)", async () => {
    const r = await createReview({ ...VALID, comment: "ngắn" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("returns NOT_FOUND when the product does not exist", async () => {
    productFindUnique.mockResolvedValue(null);
    const r = await createReview(VALID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("rejects a duplicate review (CONFLICT)", async () => {
    productFindUnique.mockResolvedValue({ id: "p1" });
    reviewFindUnique.mockResolvedValue({ id: "existing" });
    const r = await createReview(VALID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
    expect(reviewCreate).not.toHaveBeenCalled();
  });

  it("marks the review as verified when the user purchased the product", async () => {
    productFindUnique.mockResolvedValue({ id: "p1" });
    reviewFindUnique.mockResolvedValue(null);
    orderItemFindFirst.mockResolvedValue({ id: "oi1" }); // purchased
    reviewCreate.mockResolvedValue({ id: "r1", product: { slug: "slug" } });
    const r = await createReview(VALID);
    expect(r.ok).toBe(true);
    expect(reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: true, status: "PENDING" }),
      }),
    );
  });

  it("creates an unverified review when the user has not purchased", async () => {
    productFindUnique.mockResolvedValue({ id: "p1" });
    reviewFindUnique.mockResolvedValue(null);
    orderItemFindFirst.mockResolvedValue(null); // not purchased
    reviewCreate.mockResolvedValue({ id: "r1", product: { slug: "slug" } });
    const r = await createReview(VALID);
    expect(r.ok).toBe(true);
    expect(reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isVerified: false }),
      }),
    );
  });
});

describe("moderateReview", () => {
  it("rejects an invalid status value", async () => {
    const r = await moderateReview("r1", "BOGUS" as "APPROVED");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("returns NOT_FOUND for an unknown review", async () => {
    reviewFindUnique.mockResolvedValue(null);
    const r = await moderateReview("ghost", "APPROVED");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("approves a review and recomputes the product rating", async () => {
    reviewFindUnique.mockResolvedValue({
      id: "r1",
      productId: "p1",
      product: { slug: "slug" },
    });
    const r = await moderateReview("r1", "APPROVED");
    expect(r.ok).toBe(true);
    expect(reviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPROVED" }),
      }),
    );
    // recompute writes ratingCount + ratingAvg from the APPROVED aggregate
    expect(productUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ ratingCount: 2, ratingAvg: 4 }),
      }),
    );
  });
});
