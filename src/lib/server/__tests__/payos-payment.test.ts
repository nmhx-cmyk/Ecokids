import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, get, findFirst, findUnique, updateMany } = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/payos", () => ({
  isPayosConfigured: true,
  getPayos: () => ({ paymentRequests: { create, get } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst, findUnique, updateMany, findMany: vi.fn() },
  },
}));

vi.mock("@/lib/server/emails", () => ({
  sendPayosPaidEmail: vi.fn().mockResolvedValue(true),
}));

import {
  createPayosCheckout,
  markPayosOrderPaid,
  reconcilePayosOrderFromProvider,
} from "../payos-payment";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markPayosOrderPaid", () => {
  it("returns null and does not update when the order is unknown (e.g. webhook test ping)", async () => {
    findUnique.mockResolvedValue(null);
    const result = await markPayosOrderPaid(BigInt(123), 100000, "ref");
    expect(result).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects when the paid amount does not match the order total", async () => {
    findUnique.mockResolvedValue({
      orderCode: "ECO-2026-000001",
      total: 100000,
      paymentStatus: "UNPAID",
    });
    const result = await markPayosOrderPaid(BigInt(1), 50000, "ref");
    expect(result).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent — skips an order that is already paid", async () => {
    findUnique.mockResolvedValue({
      orderCode: "ECO-2026-000001",
      total: 100000,
      paymentStatus: "PAID",
    });
    const result = await markPayosOrderPaid(BigInt(1), 100000, "ref");
    expect(result).toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("marks an unpaid, matching order as paid and returns its order code", async () => {
    findUnique.mockResolvedValue({
      orderCode: "ECO-2026-000001",
      total: 100000,
      paymentStatus: "UNPAID",
      shippingAddress: { recipientName: "Nguyen Van A" },
      user: { email: "buyer@example.com", name: "Nguyen Van A" },
    });
    updateMany.mockResolvedValue({ count: 1 });
    const result = await markPayosOrderPaid(BigInt(1), 100000, "TXN-REF");
    expect(result).toBe("ECO-2026-000001");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payosOrderCode: BigInt(1), paymentStatus: "UNPAID" },
        data: expect.objectContaining({
          paymentStatus: "PAID",
          paymentRef: "TXN-REF",
        }),
      }),
    );
  });
});

describe("reconcilePayosOrderFromProvider", () => {
  it("does nothing when the order is not pending PayOS payment", async () => {
    findFirst.mockResolvedValue({
      payosOrderCode: BigInt(7),
      paymentStatus: "PAID",
    });

    const result = await reconcilePayosOrderFromProvider(
      "ECO-2026-000007",
      "user-1",
    );

    expect(result).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does nothing when PayOS has not marked the payment as paid", async () => {
    findFirst.mockResolvedValue({
      payosOrderCode: BigInt(7),
      paymentStatus: "UNPAID",
    });
    get.mockResolvedValue({
      status: "PENDING",
      amountPaid: 0,
      transactions: [],
    });

    const result = await reconcilePayosOrderFromProvider(
      "ECO-2026-000007",
      "user-1",
    );

    expect(result).toBeNull();
    expect(get).toHaveBeenCalledWith(7);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("marks the order paid when PayOS confirms a paid payment link", async () => {
    findFirst.mockResolvedValue({
      payosOrderCode: BigInt(7),
      paymentStatus: "UNPAID",
    });
    get.mockResolvedValue({
      status: "PAID",
      amountPaid: 250000,
      transactions: [{ reference: "PAYOS-TXN-1" }],
    });
    findUnique.mockResolvedValue({
      orderCode: "ECO-2026-000007",
      total: 250000,
      paymentStatus: "UNPAID",
      shippingAddress: { recipientName: "Nguyen Van A" },
      user: { email: "buyer@example.com", name: "Nguyen Van A" },
    });
    updateMany.mockResolvedValue({ count: 1 });

    const result = await reconcilePayosOrderFromProvider(
      "ECO-2026-000007",
      "user-1",
    );

    expect(result).toBe("ECO-2026-000007");
    expect(get).toHaveBeenCalledWith(7);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payosOrderCode: BigInt(7), paymentStatus: "UNPAID" },
        data: expect.objectContaining({
          paymentStatus: "PAID",
          paymentRef: "PAYOS-TXN-1",
        }),
      }),
    );
  });
});

describe("createPayosCheckout", () => {
  it("calls PayOS with a numeric order code and the string code as description", async () => {
    create.mockResolvedValue({
      checkoutUrl: "https://pay.payos.vn/web/abc",
      paymentLinkId: "plink_123",
    });

    const result = await createPayosCheckout({
      orderCode: "ECO-2026-000007",
      payosOrderCode: BigInt(7),
      amount: 250000,
      recipientName: "Nguyen Van A",
    });

    expect(result).toEqual({
      checkoutUrl: "https://pay.payos.vn/web/abc",
      paymentLinkId: "plink_123",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderCode: 7,
        amount: 250000,
        description: "ECO-2026-000007",
      }),
    );
  });
});
