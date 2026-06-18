import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderFindUnique,
  rrFindUnique,
  rrCreate,
  rrUpdate,
  orderUpdate,
  variantUpdate,
  invLogCreate,
  txn,
} = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  rrFindUnique: vi.fn(),
  rrCreate: vi.fn(),
  rrUpdate: vi.fn(),
  orderUpdate: vi.fn(),
  variantUpdate: vi.fn(),
  invLogCreate: vi.fn(),
  txn: vi.fn(),
}));

const { requireUser, requireAdmin, getCurrentUser } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: orderFindUnique },
    returnRequest: { findUnique: rrFindUnique, create: rrCreate, update: rrUpdate },
    $transaction: txn,
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  requireUser,
  requireAdmin,
  getCurrentUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestReturn, resolveReturn } from "../returns";

const VALID_REASON = "Sản phẩm bị lỗi đường may, muốn trả lại.";

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({ id: "u1" });
  requireAdmin.mockResolvedValue({ id: "admin" });
  // $transaction(cb) → run cb with a tx mock exposing the methods resolveReturn uses.
  txn.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      returnRequest: { update: rrUpdate },
      order: { update: orderUpdate },
      productVariant: { update: variantUpdate },
      inventoryLog: { create: invLogCreate },
    }),
  );
});

describe("requestReturn — error paths", () => {
  it("rejects too-short reason (validation)", async () => {
    const r = await requestReturn({ orderCode: "ECO-1", reason: "ngắn" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("returns NOT_FOUND for an unknown order", async () => {
    orderFindUnique.mockResolvedValue(null);
    const r = await requestReturn({ orderCode: "ECO-X", reason: VALID_REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("returns FORBIDDEN when the order belongs to someone else", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      userId: "OTHER",
      status: "COMPLETED",
      returnRequest: null,
    });
    const r = await requestReturn({ orderCode: "ECO-1", reason: VALID_REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
  });

  it("rejects a return on a non-COMPLETED order (CONFLICT)", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      userId: "u1",
      status: "SHIPPING",
      returnRequest: null,
    });
    const r = await requestReturn({ orderCode: "ECO-1", reason: VALID_REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
  });

  it("rejects a duplicate return request (CONFLICT)", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      userId: "u1",
      status: "COMPLETED",
      returnRequest: { id: "rr1" },
    });
    const r = await requestReturn({ orderCode: "ECO-1", reason: VALID_REASON });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
  });

  it("creates a return for a valid COMPLETED order", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      userId: "u1",
      status: "COMPLETED",
      returnRequest: null,
    });
    rrCreate.mockResolvedValue({ id: "rr-new" });
    const r = await requestReturn({ orderCode: "ECO-1", reason: VALID_REASON });
    expect(r.ok).toBe(true);
    expect(rrCreate).toHaveBeenCalledOnce();
  });
});

describe("resolveReturn — admin", () => {
  const baseRequest = {
    id: "rr1",
    status: "REQUESTED" as const,
    order: {
      id: "o1",
      orderCode: "ECO-1",
      items: [
        { variantId: "var1", quantity: 2 },
        { variantId: "var2", quantity: 1 },
      ],
    },
  };

  it("returns NOT_FOUND for an unknown request", async () => {
    rrFindUnique.mockResolvedValue(null);
    const r = await resolveReturn("ghost", "APPROVED");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("approves without touching stock", async () => {
    rrFindUnique.mockResolvedValue(baseRequest);
    const r = await resolveReturn("rr1", "APPROVED");
    expect(r.ok).toBe(true);
    expect(rrUpdate).toHaveBeenCalled();
    expect(variantUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("refund restocks every item and marks the order REFUNDED", async () => {
    rrFindUnique.mockResolvedValue(baseRequest);
    const r = await resolveReturn("rr1", "REFUNDED", "Hoàn tiền cho khách");
    expect(r.ok).toBe(true);
    // one stock increment per order item
    expect(variantUpdate).toHaveBeenCalledTimes(2);
    expect(invLogCreate).toHaveBeenCalledTimes(2);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: "REFUNDED" }),
      }),
    );
  });
});
