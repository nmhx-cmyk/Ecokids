import "server-only";
import { InventoryReason, OrderStatus, PaymentStatus } from "@prisma/client";

import { PAYOS_EXPIRE_MINUTES } from "@/lib/constants/payment";
import { getPayos } from "@/lib/payos";
import { prisma } from "@/lib/prisma";
import { sendPayosPaidEmail } from "@/lib/server/emails";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export interface CreatePayosCheckoutParams {
  orderCode: string;
  payosOrderCode: bigint;
  amount: number;
  recipientName: string;
}

export interface PayosCheckout {
  checkoutUrl: string;
  paymentLinkId: string;
}

/**
 * Creates a PayOS payment link for an order. The numeric `payosOrderCode` is
 * what PayOS uses to identify the payment; we map it back to our string
 * `orderCode` on the webhook. Throws if PayOS is unconfigured or the API fails.
 */
export async function createPayosCheckout(
  params: CreatePayosCheckoutParams,
): Promise<PayosCheckout> {
  const base = appUrl();
  const expiredAt =
    Math.floor(Date.now() / 1000) + PAYOS_EXPIRE_MINUTES * 60;

  const link = await getPayos().paymentRequests.create({
    orderCode: Number(params.payosOrderCode),
    amount: params.amount,
    // PayOS truncates the bank memo to ~25 chars; the order code fits.
    description: params.orderCode,
    returnUrl: `${base}/order-confirmation/${params.orderCode}?payos=return`,
    cancelUrl: `${base}/order-confirmation/${params.orderCode}?payos=cancel`,
    items: [
      { name: "Đơn hàng Ecokids", quantity: 1, price: params.amount },
    ],
    buyerName: params.recipientName,
    expiredAt,
  });

  return { checkoutUrl: link.checkoutUrl, paymentLinkId: link.paymentLinkId };
}

/**
 * Idempotently marks a PayOS order as paid. Only flips an order that is still
 * UNPAID, so duplicate webhook deliveries are no-ops. Returns the affected
 * order code (string) if a transition happened, otherwise null.
 */
export async function markPayosOrderPaid(
  payosOrderCode: bigint,
  paidAmount: number,
  reference: string | null,
): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { payosOrderCode },
    select: {
      orderCode: true,
      total: true,
      paymentStatus: true,
      shippingAddress: true,
      user: { select: { email: true, name: true } },
    },
  });

  // Unknown order (e.g. PayOS webhook-registration test ping) — acknowledge.
  if (!order) return null;
  // Guard against amount tampering.
  if (order.total !== paidAmount) return null;
  if (order.paymentStatus !== PaymentStatus.UNPAID) return null;

  const updated = await prisma.order.updateMany({
    where: { payosOrderCode, paymentStatus: PaymentStatus.UNPAID },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: new Date(),
      paymentRef: reference,
    },
  });

  if (updated.count === 0) return null;

  // Payment-received email (env-gated; never throws).
  const recipientName =
    (order.shippingAddress as { recipientName?: string } | null)
      ?.recipientName ||
    order.user.name ||
    "Quý khách";
  if (order.user.email) {
    await sendPayosPaidEmail(order.user.email, {
      orderCode: order.orderCode,
      recipientName,
      total: order.total,
    });
  }

  return order.orderCode;
}

/**
 * Cancels unpaid PayOS orders whose payment link has expired and restores
 * their reserved stock. Used by the cron sweep. Returns canceled order codes.
 */
export async function expireUnpaidPayosOrders(): Promise<string[]> {
  const now = new Date();
  const expired = await prisma.order.findMany({
    where: {
      paymentMethod: "PAYOS",
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      paymentExpiresAt: { lt: now },
    },
    select: {
      id: true,
      orderCode: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });

  const canceled: string[] = [];

  for (const order of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status inside the txn to avoid racing the webhook.
        const fresh = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
          },
          data: { status: OrderStatus.CANCELED, canceledAt: now },
        });
        if (fresh.count === 0) return;

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
              orderCode: order.orderCode,
              note: "Auto-cancel: PayOS payment link expired",
              adminUserId: null,
            },
          });
        }
        canceled.push(order.orderCode);
      });
    } catch (error) {
      console.error(
        `[expireUnpaidPayosOrders] failed for ${order.orderCode}`,
        error,
      );
    }
  }

  return canceled;
}
