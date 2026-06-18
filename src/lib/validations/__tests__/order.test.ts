import { describe, expect, it } from "vitest";
import { placeOrderSchema } from "@/lib/validations/order";

const base = {
  items: [{ variantId: "v1", quantity: 1 }],
  shippingAddress: {
    recipientName: "Jane Doe",
    phone: "0912345678",
    province: "Ha Noi",
    provinceCode: "01",
    district: "Ba Dinh",
    districtCode: "001",
    ward: "Phuc Xa",
    wardCode: "00001",
    addressLine: "123 Tran Phu",
  },
  paymentMethod: "COD" as const,
};

describe("placeOrderSchema", () => {
  it("accepts a minimal valid order", () => {
    const r = placeOrderSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.voucherCode).toBeUndefined();
      expect(r.data.saveAddress).toBe(false);
    }
  });

  it("accepts PAYOS but rejects BANK_TRANSFER", () => {
    expect(
      placeOrderSchema.safeParse({ ...base, paymentMethod: "PAYOS" }).success,
    ).toBe(true);
    expect(
      placeOrderSchema.safeParse({ ...base, paymentMethod: "BANK_TRANSFER" }).success,
    ).toBe(false);
  });

  it("rejects an empty items array", () => {
    expect(placeOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("rejects a quantity below 1", () => {
    expect(
      placeOrderSchema.safeParse({
        ...base,
        items: [{ variantId: "v1", quantity: 0 }],
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(
      placeOrderSchema.safeParse({
        ...base,
        shippingAddress: { ...base.shippingAddress, phone: "12345" },
      }).success,
    ).toBe(false);
  });

  it("rejects a too-short addressLine", () => {
    expect(
      placeOrderSchema.safeParse({
        ...base,
        shippingAddress: { ...base.shippingAddress, addressLine: "abc" },
      }).success,
    ).toBe(false);
  });

  it("uppercases a lowercase voucherCode", () => {
    const r = placeOrderSchema.safeParse({ ...base, voucherCode: "summer10" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voucherCode).toBe("SUMMER10");
  });

  it("transforms a blank/whitespace voucherCode to undefined", () => {
    const r = placeOrderSchema.safeParse({ ...base, voucherCode: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.voucherCode).toBeUndefined();
  });

  it("rejects a voucherCode longer than 30 chars", () => {
    expect(
      placeOrderSchema.safeParse({ ...base, voucherCode: "a".repeat(31) }).success,
    ).toBe(false);
  });
});
