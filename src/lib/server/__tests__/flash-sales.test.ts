import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { fsCreate, fsFindUnique, fsDelete, fsiDeleteMany, fsUpdate, txn } =
  vi.hoisted(() => ({
    fsCreate: vi.fn(),
    fsFindUnique: vi.fn(),
    fsDelete: vi.fn(),
    fsiDeleteMany: vi.fn(),
    fsUpdate: vi.fn(),
    txn: vi.fn(),
  }));

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    flashSale: { create: fsCreate, findUnique: fsFindUnique, delete: fsDelete, update: fsUpdate },
    flashSaleItem: { deleteMany: fsiDeleteMany },
    $transaction: txn,
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  requireAdmin,
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { createFlashSale, deleteFlashSale } from "../flash-sales";

const HOUR = 3600_000;

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin" });
});

describe("createFlashSale", () => {
  const base = {
    name: "Hè rực rỡ",
    startsAt: new Date(Date.now() - HOUR),
    endsAt: new Date(Date.now() + HOUR),
    isActive: true,
    items: [{ productId: "p1", salePrice: 99_000 }],
  };

  it("rejects a sale with no items", async () => {
    const r = await createFlashSale({ ...base, items: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
    expect(fsCreate).not.toHaveBeenCalled();
  });

  it("rejects endsAt before startsAt", async () => {
    const r = await createFlashSale({
      ...base,
      startsAt: new Date(Date.now() + HOUR),
      endsAt: new Date(Date.now() - HOUR),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a non-positive sale price", async () => {
    const r = await createFlashSale({
      ...base,
      items: [{ productId: "p1", salePrice: 0 }],
    });
    expect(r.ok).toBe(false);
  });

  it("creates a valid flash sale with items", async () => {
    fsCreate.mockResolvedValue({ id: "fs1" });
    const r = await createFlashSale(base);
    expect(r.ok).toBe(true);
    expect(fsCreate).toHaveBeenCalledOnce();
  });
});

describe("deleteFlashSale", () => {
  it("maps Prisma P2025 to NOT_FOUND", async () => {
    fsDelete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "5",
      }),
    );
    const r = await deleteFlashSale("ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });

  it("deletes an existing sale", async () => {
    fsDelete.mockResolvedValue({ id: "fs1" });
    const r = await deleteFlashSale("fs1");
    expect(r.ok).toBe(true);
  });
});
