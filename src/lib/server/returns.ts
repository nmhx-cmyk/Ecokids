"use server";

import { revalidatePath } from "next/cache";
import {
  InventoryReason,
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
} from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  requestReturnSchema,
  type ReturnAction,
} from "@/lib/validations/return";

/** Customer requests a return for a COMPLETED order (one request per order). */
export async function requestReturn(input: {
  orderCode: string;
  reason: string;
}): Promise<ServerActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = requestReturnSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }
  const { orderCode, reason } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      id: true,
      userId: true,
      status: true,
      returnRequest: { select: { id: true } },
    },
  });

  if (!order) return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đơn hàng");
  if (order.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền với đơn hàng này");
  }
  if (order.status !== OrderStatus.COMPLETED) {
    return err(
      ERROR_CODES.CONFLICT,
      "Chỉ có thể yêu cầu trả hàng cho đơn đã hoàn thành.",
    );
  }
  if (order.returnRequest) {
    return err(ERROR_CODES.CONFLICT, "Đơn hàng này đã có yêu cầu trả hàng.");
  }

  const created = await prisma.returnRequest.create({
    data: { orderId: order.id, userId: user.id, reason },
    select: { id: true },
  });

  revalidatePath(`/account/orders/${orderCode}`);
  revalidatePath("/admin/returns");
  return ok({ id: created.id });
}

/** Admin resolves a return request (approve / reject / refund). */
export async function resolveReturn(
  id: string,
  action: ReturnAction,
  adminNote?: string,
): Promise<ServerActionResult<null>> {
  const admin = await requireAdmin();

  const request = await prisma.returnRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          id: true,
          orderCode: true,
          items: { select: { variantId: true, quantity: true } },
        },
      },
    },
  });
  if (!request) return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy yêu cầu trả hàng");

  const note = adminNote?.trim() || null;
  const orderCode = request.order.orderCode;

  try {
    if (action === "REFUNDED") {
      // Refund = goods back to stock + mark order payment refunded.
      await prisma.$transaction(async (tx) => {
        await tx.returnRequest.update({
          where: { id },
          data: { status: ReturnStatus.REFUNDED, adminNote: note, resolvedAt: new Date() },
        });
        await tx.order.update({
          where: { id: request.order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
        for (const item of request.order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              delta: item.quantity,
              reason: InventoryReason.ORDER_CANCEL,
              orderCode,
              note: "Hoàn hàng (return refund)",
              adminUserId: admin.id,
            },
          });
        }
      });
    } else {
      await prisma.returnRequest.update({
        where: { id },
        data: {
          status:
            action === "APPROVED" ? ReturnStatus.APPROVED : ReturnStatus.REJECTED,
          adminNote: note,
          resolvedAt: new Date(),
        },
      });
    }

    revalidatePath("/admin/returns");
    revalidatePath(`/admin/orders/${orderCode}`);
    revalidatePath(`/account/orders/${orderCode}`);
    return ok(null);
  } catch (error) {
    console.error("[resolveReturn] failed", error);
    return err(ERROR_CODES.INTERNAL, "Không thể xử lý yêu cầu. Vui lòng thử lại.");
  }
}

/** Used by the account order page to know if a return already exists. */
export async function getMyReturnStatus(
  orderCode: string,
): Promise<ReturnStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: { userId: true, returnRequest: { select: { status: true } } },
  });
  if (!order || order.userId !== user.id) return null;
  return order.returnRequest?.status ?? null;
}
