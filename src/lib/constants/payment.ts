import type { PaymentMethod, PaymentStatus } from "@prisma/client";

type BadgeVariant =
  | "default"
  | "coral"
  | "mint"
  | "danger"
  | "warning"
  | "ink";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  PAYOS: "Thanh toán online (PayOS)",
};

export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  COD: "COD",
  BANK_TRANSFER: "Chuyển khoản",
  PAYOS: "PayOS",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, BadgeVariant> = {
  UNPAID: "warning",
  PAID: "mint",
  REFUNDED: "default",
};

/**
 * How long a PayOS payment link stays valid. After it expires, an unpaid
 * PayOS order is auto-canceled and its stock is restored. Default 24h.
 */
export const PAYOS_EXPIRE_MINUTES = Number(
  process.env.PAYOS_EXPIRE_MINUTES ?? 24 * 60,
);
