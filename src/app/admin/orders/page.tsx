import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminOrderTableFilters } from "@/components/admin/AdminOrderTableFilters";
import { AdminOrderTableRowActions } from "@/components/admin/AdminOrderTableRowActions";
import {
  ORDER_STATUS_LABELS,
} from "@/lib/constants/order-status";
import {
  getAdminOrders,
  type AdminOrderSort,
} from "@/lib/queries/admin-orders";
import { requireAdmin } from "@/lib/server/user-actions";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Đơn hàng — Quản trị",
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
};

function toSort(value: string | undefined): AdminOrderSort {
  if (value === "oldest" || value === "total-desc") return value;
  return "newest";
}

function toStatus(value: string | undefined): OrderStatus | undefined {
  if (
    value === "PENDING" ||
    value === "CONFIRMED" ||
    value === "PACKING" ||
    value === "SHIPPING" ||
    value === "COMPLETED" ||
    value === "CANCELED"
  ) {
    return value;
  }
  return undefined;
}

function toPaymentStatus(value: string | undefined): PaymentStatus | undefined {
  if (value === "UNPAID" || value === "PAID" || value === "REFUNDED") {
    return value;
  }
  return undefined;
}

function buildBaseUrl(searchParams: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  sort?: string;
}): string {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.paymentStatus)
    params.set("paymentStatus", searchParams.paymentStatus);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    sort?: string;
    page?: string;
  };
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdmin();

  const pageNum = Math.max(
    1,
    Number.parseInt(searchParams.page ?? "1", 10) || 1,
  );

  const result = await getAdminOrders({
    q: searchParams.q,
    status: toStatus(searchParams.status),
    paymentStatus: toPaymentStatus(searchParams.paymentStatus),
    sort: toSort(searchParams.sort),
    page: pageNum,
    pageSize: 20,
  });

  const baseUrl = buildBaseUrl(searchParams);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-ink-900">Đơn hàng</h2>
          <Badge variant="default">{result.total}</Badge>
        </div>
        <p className="text-sm text-ink-500">
          Quản lý và xử lý các đơn hàng của khách.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <AdminOrderTableFilters />

          {result.items.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
              title="Chưa có đơn hàng nào"
              description="Đơn hàng sẽ xuất hiện tại đây khi khách đặt mua."
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-3">Mã đơn</th>
                      <th className="px-3 py-3">Khách</th>
                      <th className="px-3 py-3 text-right">Tổng tiền</th>
                      <th className="px-3 py-3">PT thanh toán</th>
                      <th className="px-3 py-3">Trạng thái</th>
                      <th className="px-3 py-3">Thanh toán</th>
                      <th className="px-3 py-3">Ngày</th>
                      <th
                        className="w-12 px-3 py-3"
                        aria-label="Hành động"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-ink-200/60 last:border-b-0 hover:bg-cream-50"
                      >
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/orders/${order.orderCode}`}
                            className="font-mono text-sm font-medium text-ink-900 hover:text-coral-600"
                          >
                            {order.orderCode}
                          </Link>
                          {order.firstItemImage ? (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="relative h-8 w-8 overflow-hidden rounded bg-cream-100">
                                <Image
                                  src={order.firstItemImage}
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </div>
                              <span className="text-xs text-ink-500">
                                {order.itemsCount} SP
                              </span>
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-ink-500">
                              {order.itemsCount} SP
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-ink-900">
                            {order.user.name ?? "—"}
                          </p>
                          <p className="text-xs text-ink-500">
                            {order.user.email}
                          </p>
                          {order.user.phone ? (
                            <p className="text-xs text-ink-500">
                              {order.user.phone}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-ink-900">
                          {formatVnd(order.total)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="default">
                            {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={STATUS_BADGE[order.status]}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}
                          >
                            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-ink-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <AdminOrderTableRowActions
                            orderCode={order.orderCode}
                            currentStatus={order.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {result.items.map((order) => (
                  <Card key={order.id} className="border-ink-200">
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/admin/orders/${order.orderCode}`}
                            className="font-mono text-sm font-medium text-ink-900 hover:text-coral-600"
                          >
                            {order.orderCode}
                          </Link>
                          <p className="mt-1 text-xs text-ink-500">
                            {formatDate(order.createdAt)} · {order.itemsCount} SP
                          </p>
                        </div>
                        <AdminOrderTableRowActions
                          orderCode={order.orderCode}
                          currentStatus={order.status}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {order.user.name ?? order.user.email}
                        </p>
                        {order.user.phone ? (
                          <p className="text-xs text-ink-500">
                            {order.user.phone}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_BADGE[order.status]}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                        <Badge
                          variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}
                        >
                          {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                        </Badge>
                        <Badge variant="default">
                          {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                        </Badge>
                      </div>
                      <p className="text-base font-semibold text-ink-900">
                        {formatVnd(order.total)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {result.totalPages > 1 ? (
            <div className="flex justify-end">
              <Pagination
                currentPage={result.page}
                totalPages={result.totalPages}
                baseUrl={baseUrl}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

    </div>
  );
}
