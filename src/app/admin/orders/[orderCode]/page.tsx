import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Package, Printer } from "lucide-react";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminInternalNoteForm } from "@/components/admin/AdminInternalNoteForm";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { TrackingCodeForm } from "@/components/admin/TrackingCodeForm";
import { ORDER_STATUS_LABELS } from "@/lib/constants/order-status";
import { getAdminOrderByCode } from "@/lib/queries/admin-orders";
import { requireAdmin } from "@/lib/server/user-actions";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { orderCode: string };
}

const STATUS_BADGE: Record<
  OrderStatus,
  "default" | "coral" | "mint" | "warning" | "danger" | "ink"
> = {
  PENDING: "warning",
  CONFIRMED: "coral",
  PACKING: "default",
  SHIPPING: "ink",
  COMPLETED: "mint",
  CANCELED: "danger",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  "default" | "mint" | "warning" | "danger"
> = {
  UNPAID: "warning",
  PAID: "mint",
  REFUNDED: "danger",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: "COD",
  BANK_TRANSFER: "Chuyển khoản",
  PAYOS: "PayOS",
};

interface ShippingAddress {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
}

function parseShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  return {
    recipientName: String(o.recipientName ?? ""),
    phone: String(o.phone ?? ""),
    province: String(o.province ?? ""),
    district: String(o.district ?? ""),
    ward: String(o.ward ?? ""),
    addressLine: String(o.addressLine ?? ""),
  };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.orderCode} — Quản trị`,
  };
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  await requireAdmin();

  const order = await getAdminOrderByCode(params.orderCode);
  if (!order) {
    notFound();
  }

  const address = parseShippingAddress(order.shippingAddress);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-coral-600"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Tất cả đơn
        </Link>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-mono text-2xl font-semibold text-ink-900">
            {order.orderCode}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </Badge>
            <Badge variant="default">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]}
            </Badge>
            <span className="text-xs text-ink-500">
              Tạo lúc {formatDate(order.createdAt, true)}
            </span>
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/orders/${order.orderCode}/label`} target="_blank">
            <Printer className="h-4 w-4" aria-hidden="true" />
            In phiếu giao
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-ink-900">
                {order.user.name ?? "—"}
              </p>
              <p className="text-ink-700">{order.user.email}</p>
              {order.user.phone ? (
                <p className="text-ink-700">{order.user.phone}</p>
              ) : null}
              <p className="mt-2 text-xs text-ink-500">
                ID: <span className="font-mono">{order.user.id}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Địa chỉ giao hàng</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-ink-700">
              {address ? (
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-ink-900">
                    {address.recipientName}
                  </p>
                  <p>{address.phone}</p>
                  <p>
                    {address.addressLine}, {address.ward}, {address.district},{" "}
                    {address.province}
                  </p>
                </div>
              ) : (
                <p className="text-ink-500">Không có thông tin địa chỉ.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Sản phẩm ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-ink-200">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-cream-100">
                    {item.productImage ? (
                      <Image
                        src={item.productImage}
                        alt={item.productName}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-500">
                        <Package className="h-5 w-5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="line-clamp-2 text-sm font-medium text-ink-900 hover:text-coral-600"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-xs text-ink-500">
                      Size {item.variantSize} · {item.variantColor}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {formatVnd(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="flex-shrink-0 text-sm font-medium text-ink-900">
                    {formatVnd(item.subtotal)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ghi chú</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Ghi chú khách hàng
                </p>
                <p className="text-sm text-ink-700">
                  {order.note?.trim() ? order.note : "—"}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Ghi chú nội bộ
                </p>
                <AdminInternalNoteForm
                  orderCode={order.orderCode}
                  initialNote={order.internalNote}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 p-5 text-sm">
              <div className="flex justify-between text-ink-700">
                <span>Tạm tính</span>
                <span>{formatVnd(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-700">
                <span>Phí vận chuyển</span>
                <span>
                  {order.shippingFee === 0
                    ? "Miễn phí"
                    : formatVnd(order.shippingFee)}
                </span>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-mint-600">
                  <span>
                    Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ""}
                  </span>
                  <span>−{formatVnd(order.discountTotal)}</span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between border-t border-ink-200 pt-3 text-base font-semibold text-ink-900">
                <span>Tổng cộng</span>
                <span>{formatVnd(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mã vận đơn</CardTitle>
            </CardHeader>
            <CardContent>
              <TrackingCodeForm
                orderCode={order.orderCode}
                initialCode={order.trackingCode}
              />
            </CardContent>
          </Card>

          {order.returnRequest ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yêu cầu trả hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Badge variant="warning">{order.returnRequest.status}</Badge>
                <p className="whitespace-pre-wrap text-ink-700">
                  {order.returnRequest.reason}
                </p>
                <Link
                  href="/admin/returns"
                  className="text-xs text-coral-600 hover:underline"
                >
                  Xử lý tại trang Trả hàng →
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <OrderStatusActions
            order={{
              orderCode: order.orderCode,
              status: order.status,
              paymentStatus: order.paymentStatus,
              paidAt: order.paidAt,
            }}
          />
        </div>
      </div>
    </div>
  );
}
