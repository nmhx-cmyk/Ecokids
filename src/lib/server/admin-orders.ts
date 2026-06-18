"use server";

import { revalidatePath } from "next/cache";
import {
  InventoryReason,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import {
  ORDER_STATUS_LABELS,
  STATUS_TRANSITIONS,
} from "@/lib/constants/order-status";
import { prisma } from "@/lib/prisma";
import { sendOrderStatusEmail } from "@/lib/server/emails";
import { requireAdmin } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";

function revalidateOrderPaths(orderCode: string): void {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderCode}`);
  revalidatePath("/admin");
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderCode}`);
}

export async function updateOrderStatus(
  orderCode: string,
  newStatus: OrderStatus,
  internalNote?: string,
): Promise<ServerActionResult<null>> {
  const admin = await requireAdmin();

  if (!orderCode) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã đơn hàng.");
  }

  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      id: true,
      status: true,
      shippingAddress: true,
      user: { select: { email: true, name: true } },
      items: { select: { variantId: true, quantity: true } },
    },
  });

  if (!order) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đơn hàng.");
  }

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(newStatus)) {
    return err(
      ERROR_CODES.VALIDATION,
      `Không thể chuyển từ ${ORDER_STATUS_LABELS[order.status]} sang ${ORDER_STATUS_LABELS[newStatus]}.`,
    );
  }

  const trimmedNote = internalNote?.trim();

  try {
    if (newStatus === OrderStatus.CANCELED) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CANCELED,
            canceledAt: new Date(),
            ...(trimmedNote ? { internalNote: trimmedNote } : {}),
          },
        });
        for (const item of order.items) {
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
              adminUserId: admin.id,
            },
          });
        }
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
          ...(newStatus === OrderStatus.COMPLETED
            ? { completedAt: new Date() }
            : {}),
          ...(trimmedNote ? { internalNote: trimmedNote } : {}),
        },
      });
    }

    revalidateOrderPaths(orderCode);

    // Notify the customer of the new status (env-gated; never throws).
    const recipientName =
      (order.shippingAddress as { recipientName?: string } | null)
        ?.recipientName ||
      order.user.name ||
      "Quý khách";
    if (order.user.email) {
      await sendOrderStatusEmail(order.user.email, {
        orderCode,
        recipientName,
        status: newStatus,
        statusLabel: ORDER_STATUS_LABELS[newStatus],
      });
    }

    return ok(null);
  } catch (error) {
    console.error("[updateOrderStatus] failed", error);
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể cập nhật trạng thái. Vui lòng thử lại.",
    );
  }
}

export async function updateTrackingCode(
  orderCode: string,
  trackingCode: string,
): Promise<ServerActionResult<null>> {
  await requireAdmin();

  if (!orderCode) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã đơn hàng.");
  }

  const trimmed = trackingCode.trim();
  if (trimmed.length > 100) {
    return err(ERROR_CODES.VALIDATION, "Mã vận đơn tối đa 100 ký tự.");
  }

  try {
    await prisma.order.update({
      where: { orderCode },
      data: { trackingCode: trimmed.length > 0 ? trimmed : null },
    });
    revalidateOrderPaths(orderCode);
    return ok(null);
  } catch (error) {
    console.error("[updateTrackingCode] failed", error);
    return err(ERROR_CODES.INTERNAL, "Không thể lưu mã vận đơn.");
  }
}

export async function updatePaymentStatus(
  orderCode: string,
  newPaymentStatus: PaymentStatus,
): Promise<ServerActionResult<null>> {
  await requireAdmin();

  if (!orderCode) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã đơn hàng.");
  }

  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: { id: true },
  });
  if (!order) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đơn hàng.");
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: newPaymentStatus,
        ...(newPaymentStatus === PaymentStatus.PAID
          ? { paidAt: new Date() }
          : {}),
      },
    });

    revalidateOrderPaths(orderCode);
    return ok(null);
  } catch (error) {
    console.error("[updatePaymentStatus] failed", error);
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể cập nhật trạng thái thanh toán.",
    );
  }
}

export async function updateAdminNote(
  orderCode: string,
  internalNote: string,
): Promise<ServerActionResult<null>> {
  await requireAdmin();

  if (!orderCode) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã đơn hàng.");
  }

  const trimmed = internalNote.trim();

  try {
    await prisma.order.update({
      where: { orderCode },
      data: { internalNote: trimmed.length > 0 ? trimmed : null },
    });

    revalidatePath(`/admin/orders/${orderCode}`);
    return ok(null);
  } catch (error) {
    console.error("[updateAdminNote] failed", error);
    return err(ERROR_CODES.INTERNAL, "Không thể lưu ghi chú.");
  }
}
