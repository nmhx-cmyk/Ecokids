import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { bCreate, bFindUnique, bDelete, bUpdate, bAggregate, txn } = vi.hoisted(
  () => ({
    bCreate: vi.fn(),
    bFindUnique: vi.fn(),
    bDelete: vi.fn(),
    bUpdate: vi.fn(),
    bAggregate: vi.fn(),
    txn: vi.fn(),
  }),
);

const { requireAdmin } = vi.hoisted(() => ({ requireAdmin: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    banner: {
      create: bCreate,
      findUnique: bFindUnique,
      delete: bDelete,
      update: bUpdate,
      aggregate: bAggregate,
    },
    $transaction: txn,
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  requireAdmin,
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { createBanner, deleteBanner, reorderBanners } from "../banners";

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ id: "admin" });
  bAggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
});

describe("createBanner", () => {
  const base = {
    title: "Banner hè",
    imageUrl: "https://cdn.example.com/banner.jpg",
    linkUrl: "/products",
    sortOrder: 0,
    isActive: true,
  };

  it("rejects a non-URL image", async () => {
    const r = await createBanner({ ...base, imageUrl: "not-a-url" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
    expect(bCreate).not.toHaveBeenCalled();
  });

  it("rejects a too-short title", async () => {
    const r = await createBanner({ ...base, title: "x" });
    expect(r.ok).toBe(false);
  });

  it("creates a valid banner (relative linkUrl allowed)", async () => {
    bCreate.mockResolvedValue({ id: "b1" });
    const r = await createBanner(base);
    expect(r.ok).toBe(true);
    expect(bCreate).toHaveBeenCalledOnce();
  });
});

describe("deleteBanner", () => {
  it("maps Prisma P2025 to NOT_FOUND", async () => {
    bDelete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "5",
      }),
    );
    const r = await deleteBanner("ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
  });
});

describe("reorderBanners", () => {
  it("rejects an empty list", async () => {
    const r = await reorderBanners([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("persists the new order via a transaction", async () => {
    txn.mockResolvedValue([]);
    bUpdate.mockReturnValue({});
    const r = await reorderBanners(["b3", "b1", "b2"]);
    expect(r.ok).toBe(true);
    expect(txn).toHaveBeenCalledOnce();
    // one update per id, with the new index as sortOrder
    expect(bUpdate).toHaveBeenCalledWith({
      where: { id: "b3" },
      data: { sortOrder: 0 },
    });
    expect(bUpdate).toHaveBeenCalledWith({
      where: { id: "b2" },
      data: { sortOrder: 2 },
    });
  });
});
