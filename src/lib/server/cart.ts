"use server";

import { prisma } from "@/lib/prisma";
import { ERROR_CODES } from "@/lib/constants/error-codes";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";

export interface CartStockCheckItem {
  variantId: string;
  quantity: number;
}

export interface CartStockIssue {
  variantId: string;
  availableStock: number;
  requested: number;
}

export interface CartStockValidationResult {
  issues: CartStockIssue[];
}

export async function validateCartStock(
  items: CartStockCheckItem[],
): Promise<ServerActionResult<CartStockValidationResult>> {
  if (items.length === 0) {
    return ok({ issues: [] });
  }

  const variantIds = items.map((i) => i.variantId);

  try {
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, stock: true },
    });

    const stockById = new Map<string, number>();
    for (const v of variants) stockById.set(v.id, v.stock);

    const issues: CartStockIssue[] = [];
    for (const item of items) {
      const available = stockById.get(item.variantId);
      if (available === undefined) {
        issues.push({
          variantId: item.variantId,
          availableStock: 0,
          requested: item.quantity,
        });
        continue;
      }
      if (available < item.quantity) {
        issues.push({
          variantId: item.variantId,
          availableStock: available,
          requested: item.quantity,
        });
      }
    }

    return ok({ issues });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể kiểm tra tồn kho");
  }
}
