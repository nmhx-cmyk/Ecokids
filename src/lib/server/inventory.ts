"use server";

import { revalidatePath } from "next/cache";
import { InventoryReason } from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";

function reasonFromDelta(delta: number): InventoryReason {
  if (delta > 0) return InventoryReason.MANUAL_ADD;
  if (delta < 0) return InventoryReason.MANUAL_REMOVE;
  return InventoryReason.STOCK_TAKE;
}

export async function adjustVariantStock(
  variantId: string,
  newStock: number,
  note?: string,
): Promise<ServerActionResult<{ delta: number }>> {
  const admin = await requireAdmin();

  if (!variantId) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã biến thể");
  }
  if (!Number.isInteger(newStock) || newStock < 0) {
    return err(
      ERROR_CODES.VALIDATION,
      "Tồn kho phải là số nguyên không âm",
      "newStock",
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, stock: true },
      });
      if (!variant) {
        return { kind: "not_found" as const };
      }
      const delta = newStock - variant.stock;
      if (delta === 0) {
        return { kind: "ok" as const, delta: 0 };
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      await tx.inventoryLog.create({
        data: {
          variantId,
          delta,
          reason: reasonFromDelta(delta),
          note: note?.trim() || null,
          adminUserId: admin.id,
        },
      });

      return { kind: "ok" as const, delta };
    });

    if (result.kind === "not_found") {
      return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy biến thể sản phẩm");
    }

    revalidatePath("/admin/inventory");
    return ok({ delta: result.delta });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Cập nhật tồn kho thất bại");
  }
}

export async function bulkAdjustStock(
  items: Array<{ variantId: string; newStock: number }>,
  note?: string,
): Promise<ServerActionResult<{ updated: number }>> {
  const admin = await requireAdmin();

  if (!Array.isArray(items) || items.length === 0) {
    return err(ERROR_CODES.VALIDATION, "Danh sách điều chỉnh trống");
  }

  for (const item of items) {
    if (!item.variantId) {
      return err(ERROR_CODES.VALIDATION, "Thiếu mã biến thể");
    }
    if (!Number.isInteger(item.newStock) || item.newStock < 0) {
      return err(
        ERROR_CODES.VALIDATION,
        "Tồn kho phải là số nguyên không âm",
        "newStock",
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });
        if (!variant) continue;
        const delta = item.newStock - variant.stock;
        if (delta === 0) continue;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: item.newStock },
        });

        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            delta,
            reason: reasonFromDelta(delta),
            note: note?.trim() || null,
            adminUserId: admin.id,
          },
        });
        count += 1;
      }
      return count;
    });

    revalidatePath("/admin/inventory");
    return ok({ updated });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Cập nhật tồn kho thất bại");
  }
}
