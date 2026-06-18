import Link from "next/link";
import { AlertTriangle, ChevronRight, ShoppingBag } from "lucide-react";
import { OrderStatus, PaymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Last7DaysChart } from "@/components/admin/Last7DaysChart";
import { StatBlock } from "@/components/admin/StatBlock";
import { ORDER_STATUS_LABELS } from "@/lib/constants/order-status";
import { getDashboardStats } from "@/lib/queries/admin-orders";
import { requireAdmin } from "@/lib/server/user-actions";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Tổng quan — Quản trị",
};

export const dynamic = "force-dynamic";

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

function computeDelta(
  current: number,
  previous: number,
): { value: string; label: string; positive: boolean } {
  if (previous === 0) {
    return current === 0
      ? { value: "0%", label: "so với hôm qua", positive: true }
      : { value: "+100%", label: "so với hôm qua", positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  const positive = rounded >= 0;
  const sign = positive ? "+" : "";
  return {
    value: `${sign}${rounded}%`,
    label: "so với hôm qua",
    positive,
  };
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">Tổng quan</h2>
        <p className="mt-1 text-sm text-ink-500">
          Số liệu hôm nay, doanh thu và việc cần xử lý ngay.
        </p>
      </header>

      <section
        aria-label="Chỉ số nhanh"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatBlock
          title="Đơn hôm nay"
          value={String(stats.todayOrderCount)}
          delta={computeDelta(
            stats.todayOrderCount,
            stats.yesterdayOrderCount,
          )}
        />
        <StatBlock
          title="Doanh thu hôm nay"
          value={formatVnd(stats.todayRevenue)}
          delta={computeDelta(stats.todayRevenue, stats.yesterdayRevenue)}
        />
        <Link
          href="/admin/orders?status=PENDING"
          className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          <StatBlock
            title="Đơn chờ xử lý"
            value={String(stats.pendingOrderCount)}
            delta={{
              value: "Xem",
              label: "tất cả đơn chờ",
              positive: true,
            }}
          />
        </Link>
        <Link
          href="/admin/inventory?lowStock=true"
          className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
        >
          <StatBlock
            title="SP sắp hết"
            value={String(stats.lowStockVariantCount)}
            delta={{
              value: "Xem",
              label: "biến thể tồn ≤ 5",
              positive: stats.lowStockVariantCount === 0,
            }}
          />
        </Link>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Doanh thu 7 ngày gần nhất</CardTitle>
        </CardHeader>
        <CardContent>
          <Last7DaysChart data={stats.last7DaysOrders} />
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Đơn hàng gần đây</CardTitle>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm text-coral-600 hover:text-coral-700"
            >
              Tất cả
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
                title="Chưa có đơn hàng"
                description="Đơn mới sẽ hiển thị tại đây."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-ink-200">
                {stats.recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.orderCode}`}
                        className="font-mono text-sm font-medium text-ink-900 hover:text-coral-600"
                      >
                        {order.orderCode}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {order.customerName} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-ink-900">
                        {formatVnd(order.total)}
                      </span>
                      <div className="flex gap-1">
                        <Badge variant={STATUS_BADGE[order.status]}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                        {order.paymentStatus !== PaymentStatus.PAID ? (
                          <Badge variant="warning">
                            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Sản phẩm sắp hết</CardTitle>
            <Link
              href="/admin/inventory?lowStock=true"
              className="inline-flex items-center gap-1 text-sm text-coral-600 hover:text-coral-700"
            >
              Quản lý kho
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.lowStockVariants.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
                title="Tồn kho ổn định"
                description="Không có biến thể nào tồn ≤ 5."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-ink-200">
                {stats.lowStockVariants.map((variant) => (
                  <li
                    key={variant.variantId}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${variant.productId}/edit`}
                        className="line-clamp-1 text-sm font-medium text-ink-900 hover:text-coral-600"
                      >
                        {variant.productName}
                      </Link>
                      <p className="text-xs text-ink-500">
                        {variant.sku} · Size {variant.size} · {variant.color}
                      </p>
                    </div>
                    <Badge
                      variant={variant.stock === 0 ? "danger" : "warning"}
                    >
                      Còn {variant.stock}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
