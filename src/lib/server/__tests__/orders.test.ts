import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser } = vi.hoisted(() => ({ requireUser: vi.fn() }));

// PayOS reported as NOT configured so the online-payment guard triggers.
vi.mock("@/lib/payos", () => ({
  isPayosConfigured: false,
  getPayos: () => ({ paymentRequests: { create: vi.fn() } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("@/lib/server/payos-payment", () => ({ createPayosCheckout: vi.fn() }));
vi.mock("@/lib/server/emails", () => ({ sendOrderPlacedEmail: vi.fn() }));
vi.mock("@/lib/server/user-actions", () => ({
  requireUser,
  requireAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { placeOrder } from "../orders";

const validAddress = {
  recipientName: "Nguyen Van A",
  phone: "0901234567",
  province: "Hà Nội",
  provinceCode: "01",
  district: "Cầu Giấy",
  districtCode: "001",
  ward: "Dịch Vọng",
  wardCode: "00010",
  addressLine: "123 Đường Lê Lợi",
};

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "u1", email: "u@x.com" });
});

describe("placeOrder — guards", () => {
  it("rejects an empty cart (validation)", async () => {
    const r = await placeOrder({
      items: [],
      shippingAddress: validAddress,
      paymentMethod: "COD",
      saveAddress: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("blocks PayOS checkout when PayOS is not configured", async () => {
    const r = await placeOrder({
      items: [{ variantId: "v1", quantity: 1 }],
      shippingAddress: validAddress,
      paymentMethod: "PAYOS",
      saveAddress: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("INTERNAL");
      expect(r.error.message).toMatch(/COD/);
    }
  });
});
