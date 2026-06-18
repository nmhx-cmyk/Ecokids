"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  flashSaleSchema,
  type FlashSaleInput,
} from "@/lib/validations/flash-sale";

function firstIssue(issues: { message: string; path: (string | number)[] }[]) {
  const issue = issues[0];
  return {
    message: issue?.message ?? "Dữ liệu không hợp lệ",
    field: issue?.path.join("."),
  };
}

export async function createFlashSale(
  input: FlashSaleInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = flashSaleSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const created = await prisma.flashSale.create({
    data: {
      name: data.name,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: data.isActive,
      items: {
        create: data.items.map((i) => ({
          productId: i.productId,
          salePrice: i.salePrice,
        })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/admin/flash-sales");
  revalidatePath("/");
  return ok({ id: created.id });
}

export async function updateFlashSale(
  id: string,
  input: FlashSaleInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã chương trình");

  const parsed = flashSaleSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const current = await prisma.flashSale.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy chương trình");

  // Replace items wholesale for simplicity.
  await prisma.$transaction([
    prisma.flashSaleItem.deleteMany({ where: { flashSaleId: id } }),
    prisma.flashSale.update({
      where: { id },
      data: {
        name: data.name,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            salePrice: i.salePrice,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/admin/flash-sales");
  revalidatePath("/");
  return ok({ id });
}

export async function deleteFlashSale(
  id: string,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã chương trình");

  try {
    await prisma.flashSale.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy chương trình");
    }
    throw error;
  }

  revalidatePath("/admin/flash-sales");
  revalidatePath("/");
  return ok({ id });
}
