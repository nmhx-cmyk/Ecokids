import "server-only";
import type { DiscountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AdminVoucherRow {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  isRunning: boolean;
}

export async function getVouchers(): Promise<AdminVoucherRow[]> {
  const now = new Date();
  const rows = await prisma.voucher.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map((v) => ({
    id: v.id,
    code: v.code,
    description: v.description,
    discountType: v.discountType,
    discountValue: v.discountValue,
    minOrderValue: v.minOrderValue,
    maxDiscount: v.maxDiscount,
    usageLimit: v.usageLimit,
    usageCount: v.usageCount,
    perUserLimit: v.perUserLimit,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    isActive: v.isActive,
    isRunning:
      v.isActive &&
      v.startsAt <= now &&
      v.endsAt >= now &&
      (v.usageLimit === null || v.usageCount < v.usageLimit),
  }));
}

export async function getVoucherById(id: string) {
  return prisma.voucher.findUnique({ where: { id } });
}
