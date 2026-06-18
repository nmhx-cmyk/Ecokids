import { describe, expect, it } from "vitest";
import { voucherSchema, applyVoucherSchema } from "@/lib/validations/voucher";

describe("voucherSchema", () => {
  const base = {
    code: "summer10",
    discountType: "PERCENT" as const,
    discountValue: 10,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2026-02-01T00:00:00.000Z",
  };

  it("accepts a valid PERCENT voucher and uppercases the code", () => {
    const r = voucherSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe("SUMMER10");
      expect(r.data.minOrderValue).toBe(0);
      expect(r.data.isActive).toBe(true);
    }
  });

  it("accepts a valid FIXED voucher with value above 100", () => {
    const r = voucherSchema.safeParse({
      ...base,
      discountType: "FIXED",
      discountValue: 50000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a code containing a space (regex after uppercase)", () => {
    expect(voucherSchema.safeParse({ ...base, code: "ab cd" }).success).toBe(false);
  });

  it("enforces code length bounds (3-30)", () => {
    expect(voucherSchema.safeParse({ ...base, code: "ab" }).success).toBe(false);
    expect(voucherSchema.safeParse({ ...base, code: "a".repeat(31) }).success).toBe(
      false,
    );
  });

  it("rejects PERCENT value of 0 and 101", () => {
    expect(
      voucherSchema.safeParse({ ...base, discountValue: 0 }).success,
    ).toBe(false);
    expect(
      voucherSchema.safeParse({ ...base, discountValue: 101 }).success,
    ).toBe(false);
  });

  it("rejects non-positive or float discountValue", () => {
    expect(
      voucherSchema.safeParse({ ...base, discountType: "FIXED", discountValue: -5 })
        .success,
    ).toBe(false);
    expect(
      voucherSchema.safeParse({ ...base, discountType: "FIXED", discountValue: 5.5 })
        .success,
    ).toBe(false);
  });

  it("rejects negative minOrderValue", () => {
    expect(
      voucherSchema.safeParse({ ...base, minOrderValue: -1 }).success,
    ).toBe(false);
  });

  it("normalizes missing/null optional limits to null", () => {
    const r = voucherSchema.safeParse({
      ...base,
      maxDiscount: null,
      usageLimit: undefined,
      // perUserLimit omitted entirely
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.maxDiscount).toBeNull();
      expect(r.data.usageLimit).toBeNull();
      expect(r.data.perUserLimit).toBeNull();
    }
  });

  it("rejects zero for optional limits (.positive runs before transform)", () => {
    expect(voucherSchema.safeParse({ ...base, maxDiscount: 0 }).success).toBe(false);
    expect(voucherSchema.safeParse({ ...base, usageLimit: 0 }).success).toBe(false);
  });

  it("rejects endsAt equal to or before startsAt", () => {
    expect(
      voucherSchema.safeParse({ ...base, endsAt: base.startsAt }).success,
    ).toBe(false);
    expect(
      voucherSchema.safeParse({
        ...base,
        startsAt: "2026-02-01T00:00:00.000Z",
        endsAt: "2026-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("trims a blank description to null", () => {
    const r = voucherSchema.safeParse({ ...base, description: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBeNull();
  });

  it("trims a provided description", () => {
    const r = voucherSchema.safeParse({ ...base, description: "  Khuyen mai  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.description).toBe("Khuyen mai");
  });
});

describe("applyVoucherSchema", () => {
  it("rejects an empty code", () => {
    expect(
      applyVoucherSchema.safeParse({ code: "", subtotal: 100 }).success,
    ).toBe(false);
  });

  it("coerces a string subtotal to a number", () => {
    const r = applyVoucherSchema.safeParse({ code: "SUMMER10", subtotal: "100" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.subtotal).toBe(100);
  });
});
