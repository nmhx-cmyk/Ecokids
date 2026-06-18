"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { computeVoucherDiscount } from "@/lib/pricing";
import { requireAdmin, getCurrentUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  applyVoucherSchema,
  voucherSchema,
  type ApplyVoucherInput,
  type VoucherInput,
} from "@/lib/validations/voucher";
import { formatVnd } from "@/lib/utils/format";

function firstIssue(issues: { message: string; path: (string | number)[] }[]) {
  const issue = issues[0];
  return {
    message: issue?.message ?? "Dữ liệu không hợp lệ",
    field: issue?.path[0]?.toString(),
  };
}

export interface ValidatedVoucher {
  id: string;
  code: string;
  description: string | null;
  discount: number;
}

/**
 * Read-only validation of a voucher for a given subtotal + user. Does NOT
 * consume the voucher — placeOrder performs the atomic redemption.
 */
export async function validateVoucher(
  code: string,
  subtotal: number,
  userId: string,
): Promise<ServerActionResult<ValidatedVoucher>> {
  const voucher = await prisma.voucher.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!voucher) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá không tồn tại", "code");
  }
  if (!voucher.isActive) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá đã bị vô hiệu hoá", "code");
  }

  const now = new Date();
  if (now < voucher.startsAt) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá chưa có hiệu lực", "code");
  }
  if (now > voucher.endsAt) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá đã hết hạn", "code");
  }
  if (voucher.usageLimit !== null && voucher.usageCount >= voucher.usageLimit) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá đã hết lượt sử dụng", "code");
  }
  if (subtotal < voucher.minOrderValue) {
    return err(
      ERROR_CODES.VALIDATION,
      `Đơn tối thiểu ${formatVnd(voucher.minOrderValue)} để dùng mã này`,
      "code",
    );
  }
  if (voucher.perUserLimit !== null) {
    const used = await prisma.voucherRedemption.count({
      where: { voucherId: voucher.id, userId },
    });
    if (used >= voucher.perUserLimit) {
      return err(ERROR_CODES.VALIDATION, "Bạn đã sử dụng mã này rồi", "code");
    }
  }

  const discount = computeVoucherDiscount(voucher, subtotal);
  if (discount <= 0) {
    return err(ERROR_CODES.VALIDATION, "Mã giảm giá không áp dụng được cho đơn này", "code");
  }

  return ok({
    id: voucher.id,
    code: voucher.code,
    description: voucher.description,
    discount,
  });
}

/** Checkout preview: validate a code against the current cart subtotal. */
export async function previewVoucher(
  input: ApplyVoucherInput,
): Promise<ServerActionResult<ValidatedVoucher>> {
  const user = await getCurrentUser();
  if (!user) {
    return err(ERROR_CODES.UNAUTHORIZED, "Vui lòng đăng nhập để dùng mã giảm giá");
  }
  const parsed = applyVoucherSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  return validateVoucher(parsed.data.code, parsed.data.subtotal, user.id);
}

// ============================================
// Admin CRUD
// ============================================

export async function createVoucher(
  input: VoucherInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = voucherSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const existing = await prisma.voucher.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (existing) {
    return err(ERROR_CODES.CONFLICT, "Mã giảm giá đã tồn tại", "code");
  }

  const created = await prisma.voucher.create({
    data: {
      code: data.code,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      perUserLimit: data.perUserLimit,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: data.isActive,
    },
    select: { id: true },
  });

  revalidatePath("/admin/vouchers");
  return ok({ id: created.id });
}

export async function updateVoucher(
  id: string,
  input: VoucherInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã voucher");

  const parsed = voucherSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const current = await prisma.voucher.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy voucher");

  const codeOwner = await prisma.voucher.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (codeOwner && codeOwner.id !== id) {
    return err(ERROR_CODES.CONFLICT, "Mã giảm giá đã tồn tại", "code");
  }

  await prisma.voucher.update({
    where: { id },
    data: {
      code: data.code,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      perUserLimit: data.perUserLimit,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/vouchers");
  return ok({ id });
}

export async function deleteVoucher(
  id: string,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã voucher");

  try {
    await prisma.voucher.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy voucher");
    }
    throw error;
  }

  revalidatePath("/admin/vouchers");
  return ok({ id });
}
