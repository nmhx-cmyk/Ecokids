import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderFindUnique, orderUpdate, txn, sendStatusEmail } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  txn: vi.fn(),
  sendStatusEmail: vi.fn(),
}));

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: orderFindUnique, update: orderUpdate },
    $transaction: txn,
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  requireAdmin,
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/server/emails", () => ({ sendOrderStatusEmail: sendStatusEmail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateOrderStatus, updateTrackingCode } from "../admin-orders";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin" });
  sendStatusEmail.mockResolvedValue(true);
  orderUpdate.mockResolvedValue({});
});

describe("updateOrderStatus — state machine", () => {
  it("returns NOT_FOUND for an unknown order", async () => {
    orderFindUnique.mockResolvedValue(null);
    const r = await updateOrderStatus("ECO-X", "CONFIRMED");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("rejects an illegal transition (COMPLETED → PENDING)", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      status: "COMPLETED",
      shippingAddress: { recipientName: "A" },
      user: { email: "a@x.com", name: "A" },
      items: [],
    });
    const r = await updateOrderStatus("ECO-1", "PENDING");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects skipping states (PENDING → SHIPPING)", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      status: "PENDING",
      shippingAddress: { recipientName: "A" },
      user: { email: "a@x.com", name: "A" },
      items: [],
    });
    const r = await updateOrderStatus("ECO-1", "SHIPPING");
    expect(r.ok).toBe(false);
  });

  it("allows a legal transition (PENDING → CONFIRMED) and emails the customer", async () => {
    orderFindUnique.mockResolvedValue({
      id: "o1",
      status: "PENDING",
      shippingAddress: { recipientName: "Nguyen Van A" },
      user: { email: "a@x.com", name: "A" },
      items: [],
    });
    const r = await updateOrderStatus("ECO-1", "CONFIRMED");
    expect(r.ok).toBe(true);
    expect(orderUpdate).toHaveBeenCalled();
    expect(sendStatusEmail).toHaveBeenCalledWith(
      "a@x.com",
      expect.objectContaining({ status: "CONFIRMED" }),
    );
  });

  it("restocks items when cancelling", async () => {
    const variantUpdate = vi.fn();
    const invLogCreate = vi.fn();
    txn.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        order: { update: vi.fn() },
        productVariant: { update: variantUpdate },
        inventoryLog: { create: invLogCreate },
      }),
    );
    orderFindUnique.mockResolvedValue({
      id: "o1",
      status: "PENDING",
      shippingAddress: { recipientName: "A" },
      user: { email: "a@x.com", name: "A" },
      items: [{ variantId: "v1", quantity: 3 }],
    });
    const r = await updateOrderStatus("ECO-1", "CANCELED");
    expect(r.ok).toBe(true);
    expect(variantUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: { increment: 3 } } }),
    );
  });
});

describe("updateTrackingCode", () => {
  it("rejects a too-long code", async () => {
    const r = await updateTrackingCode("ECO-1", "x".repeat(101));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("saves a valid tracking code", async () => {
    const r = await updateTrackingCode("ECO-1", "GHN123456");
    expect(r.ok).toBe(true);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderCode: "ECO-1" },
        data: { trackingCode: "GHN123456" },
      }),
    );
  });

  it("clears the tracking code when blank", async () => {
    const r = await updateTrackingCode("ECO-1", "   ");
    expect(r.ok).toBe(true);
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { trackingCode: null } }),
    );
  });
});
