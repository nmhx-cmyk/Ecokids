import { describe, expect, it } from "vitest";
import { createReviewSchema, adminReplySchema } from "@/lib/validations/review";

describe("createReviewSchema", () => {
  const base = {
    productId: "p1",
    rating: 5,
    comment: "Sản phẩm rất tốt, con tôi thích lắm.",
  };

  it("accepts a valid review", () => {
    const r = createReviewSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejects rating below 1 and above 5", () => {
    expect(createReviewSchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
  });

  it("rejects too-short comment", () => {
    expect(createReviewSchema.safeParse({ ...base, comment: "ngắn" }).success).toBe(
      false,
    );
  });

  it("normalizes empty/whitespace title to null", () => {
    const r = createReviewSchema.safeParse({ ...base, title: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBeNull();
  });

  it("trims a provided title", () => {
    const r = createReviewSchema.safeParse({ ...base, title: "  Tốt  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe("Tốt");
  });

  it("accepts null title (from edit form)", () => {
    const r = createReviewSchema.safeParse({ ...base, title: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBeNull();
  });
});

describe("adminReplySchema", () => {
  it("rejects empty reply", () => {
    expect(
      adminReplySchema.safeParse({ reviewId: "r1", reply: "" }).success,
    ).toBe(false);
  });

  it("accepts a valid reply", () => {
    expect(
      adminReplySchema.safeParse({ reviewId: "r1", reply: "Cảm ơn bạn!" }).success,
    ).toBe(true);
  });
});
