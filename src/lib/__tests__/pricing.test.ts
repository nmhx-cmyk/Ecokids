import { describe, expect, it } from "vitest";
import { computeVoucherDiscount, effectiveUnitPrice } from "@/lib/pricing";

describe("effectiveUnitPrice", () => {
  it("uses base price when no variant/flash price", () => {
    expect(effectiveUnitPrice(100_000, null, null)).toBe(100_000);
  });

  it("prefers variant price over base", () => {
    expect(effectiveUnitPrice(100_000, 80_000, null)).toBe(80_000);
  });

  it("applies flash price only when lower than regular", () => {
    expect(effectiveUnitPrice(100_000, null, 70_000)).toBe(70_000);
    expect(effectiveUnitPrice(100_000, 80_000, 90_000)).toBe(80_000);
    expect(effectiveUnitPrice(100_000, 80_000, 60_000)).toBe(60_000);
  });
});

describe("computeVoucherDiscount", () => {
  it("returns 0 below minOrderValue", () => {
    expect(
      computeVoucherDiscount(
        { discountType: "FIXED", discountValue: 50_000, minOrderValue: 200_000, maxDiscount: null },
        150_000,
      ),
    ).toBe(0);
  });

  it("applies a fixed discount", () => {
    expect(
      computeVoucherDiscount(
        { discountType: "FIXED", discountValue: 50_000, minOrderValue: 0, maxDiscount: null },
        300_000,
      ),
    ).toBe(50_000);
  });

  it("applies a percentage discount", () => {
    expect(
      computeVoucherDiscount(
        { discountType: "PERCENT", discountValue: 10, minOrderValue: 0, maxDiscount: null },
        300_000,
      ),
    ).toBe(30_000);
  });

  it("caps a percentage discount at maxDiscount", () => {
    expect(
      computeVoucherDiscount(
        { discountType: "PERCENT", discountValue: 50, minOrderValue: 0, maxDiscount: 100_000 },
        300_000,
      ),
    ).toBe(100_000);
  });

  it("never exceeds the subtotal", () => {
    expect(
      computeVoucherDiscount(
        { discountType: "FIXED", discountValue: 500_000, minOrderValue: 0, maxDiscount: null },
        300_000,
      ),
    ).toBe(300_000);
  });
});
