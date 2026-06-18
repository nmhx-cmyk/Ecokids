import { beforeEach, describe, expect, it, vi } from "vitest";

const { wlFindUnique, wlFindMany, wlCreate, wlDelete, wlDeleteMany, productFindUnique } =
  vi.hoisted(() => ({
    wlFindUnique: vi.fn(),
    wlFindMany: vi.fn(),
    wlCreate: vi.fn(),
    wlDelete: vi.fn(),
    wlDeleteMany: vi.fn(),
    productFindUnique: vi.fn(),
  }));

const { getCurrentUser } = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wishlistItem: {
      findUnique: wlFindUnique,
      findMany: wlFindMany,
      create: wlCreate,
      delete: wlDelete,
      deleteMany: wlDeleteMany,
    },
    product: { findUnique: productFindUnique },
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  getCurrentUser,
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  getMyWishlistIds,
  removeFromWishlist,
  toggleWishlist,
} from "../wishlist";

beforeEach(() => vi.clearAllMocks());

describe("getMyWishlistIds", () => {
  it("returns [] for a guest", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await getMyWishlistIds()).toEqual([]);
    expect(wlFindMany).not.toHaveBeenCalled();
  });

  it("returns product ids for a logged-in user", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    wlFindMany.mockResolvedValue([{ productId: "p1" }, { productId: "p2" }]);
    expect(await getMyWishlistIds()).toEqual(["p1", "p2"]);
  });
});

describe("toggleWishlist", () => {
  it("rejects a guest with UNAUTHORIZED", async () => {
    getCurrentUser.mockResolvedValue(null);
    const r = await toggleWishlist("p1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHORIZED");
  });

  it("removes an item that is already wishlisted (active=false)", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    wlFindUnique.mockResolvedValue({ id: "w1" });
    const r = await toggleWishlist("p1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.active).toBe(false);
    expect(wlDelete).toHaveBeenCalledWith({ where: { id: "w1" } });
    expect(wlCreate).not.toHaveBeenCalled();
  });

  it("adds a new item when not wishlisted and product exists (active=true)", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    wlFindUnique.mockResolvedValue(null);
    productFindUnique.mockResolvedValue({ id: "p1" });
    const r = await toggleWishlist("p1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.active).toBe(true);
    expect(wlCreate).toHaveBeenCalledOnce();
  });

  it("returns NOT_FOUND when adding a non-existent product", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    wlFindUnique.mockResolvedValue(null);
    productFindUnique.mockResolvedValue(null);
    const r = await toggleWishlist("ghost");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    expect(wlCreate).not.toHaveBeenCalled();
  });
});

describe("removeFromWishlist", () => {
  it("rejects a guest", async () => {
    getCurrentUser.mockResolvedValue(null);
    const r = await removeFromWishlist("p1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHORIZED");
  });

  it("deletes for the owner", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" });
    wlDeleteMany.mockResolvedValue({ count: 1 });
    const r = await removeFromWishlist("p1");
    expect(r.ok).toBe(true);
    expect(wlDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", productId: "p1" },
    });
  });
});
