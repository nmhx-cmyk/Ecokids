import { describe, expect, it } from "vitest";
import { bannerSchema, reorderBannersSchema } from "@/lib/validations/banner";

describe("bannerSchema", () => {
  const base = {
    title: "Summer Banner",
    imageUrl: "https://cdn.example.com/banner.jpg",
  };

  it("accepts a valid banner with defaults", () => {
    const r = bannerSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.linkUrl).toBeNull();
      expect(r.data.sortOrder).toBe(0);
      expect(r.data.isActive).toBe(true);
    }
  });

  it("enforces title length bounds (2-100)", () => {
    expect(bannerSchema.safeParse({ ...base, title: "a" }).success).toBe(false);
    expect(
      bannerSchema.safeParse({ ...base, title: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("rejects a non-URL imageUrl", () => {
    expect(
      bannerSchema.safeParse({ ...base, imageUrl: "not-a-url" }).success,
    ).toBe(false);
  });

  it("accepts a relative in-site path as linkUrl (no url() check)", () => {
    const r = bannerSchema.safeParse({ ...base, linkUrl: "/products?category=x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.linkUrl).toBe("/products?category=x");
  });

  it("normalizes blank linkUrl to null", () => {
    const r = bannerSchema.safeParse({ ...base, linkUrl: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.linkUrl).toBeNull();
  });

  it("rejects a linkUrl longer than 500 chars", () => {
    expect(
      bannerSchema.safeParse({ ...base, linkUrl: "/" + "a".repeat(500) }).success,
    ).toBe(false);
  });

  it("coerces a string sortOrder to a number", () => {
    const r = bannerSchema.safeParse({ ...base, sortOrder: "3" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sortOrder).toBe(3);
  });

  it("rejects a negative sortOrder", () => {
    expect(bannerSchema.safeParse({ ...base, sortOrder: -1 }).success).toBe(false);
  });
});

describe("reorderBannersSchema", () => {
  it("accepts a non-empty list of ids", () => {
    expect(reorderBannersSchema.safeParse({ ids: ["a", "b"] }).success).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(reorderBannersSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("rejects an empty-string id", () => {
    expect(reorderBannersSchema.safeParse({ ids: [""] }).success).toBe(false);
  });
});
