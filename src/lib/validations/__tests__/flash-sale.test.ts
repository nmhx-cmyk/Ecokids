import { describe, expect, it } from "vitest";
import { flashSaleSchema, flashSaleItemSchema } from "@/lib/validations/flash-sale";

describe("flashSaleItemSchema", () => {
  it("accepts a valid item", () => {
    expect(
      flashSaleItemSchema.safeParse({ productId: "p1", salePrice: 99000 }).success,
    ).toBe(true);
  });

  it("rejects zero, negative, or float salePrice", () => {
    expect(
      flashSaleItemSchema.safeParse({ productId: "p1", salePrice: 0 }).success,
    ).toBe(false);
    expect(
      flashSaleItemSchema.safeParse({ productId: "p1", salePrice: -1 }).success,
    ).toBe(false);
    expect(
      flashSaleItemSchema.safeParse({ productId: "p1", salePrice: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects an empty productId", () => {
    expect(
      flashSaleItemSchema.safeParse({ productId: "", salePrice: 100 }).success,
    ).toBe(false);
  });
});

describe("flashSaleSchema", () => {
  const base = {
    name: "Flash Sale Tet",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-01-02T00:00:00.000Z",
    items: [{ productId: "p1", salePrice: 99000 }],
  };

  it("accepts a valid flash sale with one item", () => {
    const r = flashSaleSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isActive).toBe(true);
  });

  it("rejects an empty items array", () => {
    expect(flashSaleSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("enforces name length bounds (2-100)", () => {
    expect(flashSaleSchema.safeParse({ ...base, name: "a" }).success).toBe(false);
    expect(
      flashSaleSchema.safeParse({ ...base, name: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects endsAt equal to or before startsAt", () => {
    expect(
      flashSaleSchema.safeParse({ ...base, endsAt: base.startsAt }).success,
    ).toBe(false);
    expect(
      flashSaleSchema.safeParse({
        ...base,
        startsAt: "2026-01-02T00:00:00.000Z",
        endsAt: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejects when any item is invalid", () => {
    expect(
      flashSaleSchema.safeParse({
        ...base,
        items: [{ productId: "p1", salePrice: 0 }],
      }).success,
    ).toBe(false);
  });
});
