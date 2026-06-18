"use server";

import { revalidatePath } from "next/cache";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import { addressSchema, type AddressInput } from "@/lib/validations/address";

export async function createAddress(
  input: AddressInput,
): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path.join(".") || undefined,
    );
  }

  const data = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: { ...data, userId: user.id },
        select: { id: true },
      });
    });

    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return ok({ id: created.id });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể lưu địa chỉ. Vui lòng thử lại.");
  }
}

export async function updateAddress(
  id: string,
  input: AddressInput,
): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  if (!id) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã địa chỉ");
  }

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path.join(".") || undefined,
    );
  }

  const existing = await prisma.address.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy địa chỉ");
  }
  if (existing.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền sửa địa chỉ này");
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      await tx.address.update({
        where: { id },
        data,
      });
    });

    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return ok({ id });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể cập nhật địa chỉ. Vui lòng thử lại.");
  }
}

export async function deleteAddress(
  id: string,
): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  if (!id) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã địa chỉ");
  }

  const existing = await prisma.address.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy địa chỉ");
  }
  if (existing.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền xóa địa chỉ này");
  }

  try {
    await prisma.address.delete({ where: { id } });
    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return ok(null);
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể xóa địa chỉ. Vui lòng thử lại.");
  }
}

export async function setDefaultAddress(
  id: string,
): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  if (!id) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã địa chỉ");
  }

  const existing = await prisma.address.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy địa chỉ");
  }
  if (existing.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền với địa chỉ này");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
      await tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    revalidatePath("/account/addresses");
    revalidatePath("/checkout");
    return ok(null);
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể đặt mặc định. Vui lòng thử lại.");
  }
}
