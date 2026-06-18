import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Voucher } from "@prisma/client";

const { voucherFindUnique, redemptionCount, voucherCreate } = vi.hoisted(() => ({
  voucherFindUnique: vi.fn(),
  redemptionCount: vi.fn(),
  voucherCreate: vi.fn(),
}));

const { getCurrentUser, requireAdmin } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    voucher: { findUnique: voucherFindUnique, create: voucherCreate },
    voucherRedemption: { count: redemptionCount },
  },
}));

vi.mock("@/lib/server/user-actions", () => ({
  getCurrentUser,
  requireAdmin,
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createVoucher,
  previewVoucher,
  validateVoucher,
} from "../vouchers";

const HOUR = 3600_000;

function makeVoucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: "v1",
    code: "SALE10",
    description: null,
    discountType: "PERCENT",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    startsAt: new Date(Date.now() - HOUR),
    endsAt: new Date(Date.now() + HOUR),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  redemptionCount.mockResolvedValue(0);
});

describe("validateVoucher — error paths", () => {
  it("rejects unknown code", async () => {
    voucherFindUnique.mockResolvedValue(null);
    const r = await validateVoucher("NOPE", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("rejects an inactive voucher", async () => {
    voucherFindUnique.mockResolvedValue(makeVoucher({ isActive: false }));
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
  });

  it("rejects a not-yet-started voucher", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ startsAt: new Date(Date.now() + HOUR) }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/chưa/i);
  });

  it("rejects an expired voucher", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ endsAt: new Date(Date.now() - HOUR) }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/hết hạn/i);
  });

  it("rejects when total usage limit reached", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ usageLimit: 5, usageCount: 5 }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/hết lượt/i);
  });

  it("rejects when subtotal is below minOrderValue", async () => {
    voucherFindUnique.mockResolvedValue(makeVoucher({ minOrderValue: 500_000 }));
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/tối thiểu/i);
  });

  it("rejects when the per-user limit is reached", async () => {
    voucherFindUnique.mockResolvedValue(makeVoucher({ perUserLimit: 1 }));
    redemptionCount.mockResolvedValue(1);
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/đã sử dụng/i);
  });

  it("rejects when the computed discount is zero", async () => {
    // FIXED 0 → discount 0 → rejected.
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ discountType: "FIXED", discountValue: 0 }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(false);
  });
});

describe("validateVoucher — success", () => {
  it("returns the percentage discount", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ discountType: "PERCENT", discountValue: 10 }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.discount).toBe(30_000);
  });

  it("caps a percentage discount at maxDiscount", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ discountType: "PERCENT", discountValue: 50, maxDiscount: 50_000 }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.discount).toBe(50_000);
  });

  it("returns a fixed discount", async () => {
    voucherFindUnique.mockResolvedValue(
      makeVoucher({ discountType: "FIXED", discountValue: 25_000 }),
    );
    const r = await validateVoucher("SALE10", 300_000, "u1");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.discount).toBe(25_000);
  });
});

describe("previewVoucher — auth + validation", () => {
  it("rejects a guest (not logged in)", async () => {
    getCurrentUser.mockResolvedValue(null);
    const r = await previewVoucher({ code: "SALE10", subtotal: 300_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an empty code", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "USER" });
    const r = await previewVoucher({ code: "", subtotal: 300_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("delegates to validateVoucher for a logged-in user", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "USER" });
    voucherFindUnique.mockResolvedValue(makeVoucher());
    const r = await previewVoucher({ code: "SALE10", subtotal: 300_000 });
    expect(r.ok).toBe(true);
  });
});

describe("createVoucher — admin CRUD", () => {
  beforeEach(() => {
    requireAdmin.mockResolvedValue({ id: "admin", role: "ADMIN" });
  });

  it("rejects a duplicate code", async () => {
    voucherFindUnique.mockResolvedValue(makeVoucher());
    const r = await createVoucher({
      code: "SALE10",
      description: null,
      discountType: "PERCENT",
      discountValue: 10,
      minOrderValue: 0,
      maxDiscount: null,
      usageLimit: null,
      perUserLimit: null,
      startsAt: new Date(Date.now() - HOUR),
      endsAt: new Date(Date.now() + HOUR),
      isActive: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CONFLICT");
    expect(voucherCreate).not.toHaveBeenCalled();
  });

  it("creates a new voucher when the code is free", async () => {
    voucherFindUnique.mockResolvedValue(null);
    voucherCreate.mockResolvedValue({ id: "new1" });
    const r = await createVoucher({
      code: "NEW20",
      description: null,
      discountType: "FIXED",
      discountValue: 20_000,
      minOrderValue: 0,
      maxDiscount: null,
      usageLimit: null,
      perUserLimit: null,
      startsAt: new Date(Date.now() - HOUR),
      endsAt: new Date(Date.now() + HOUR),
      isActive: true,
    });
    expect(r.ok).toBe(true);
    expect(voucherCreate).toHaveBeenCalledOnce();
  });
});
