import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/constants/order-status";
import { getCustomerById } from "@/lib/queries/customers";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Chi tiết khách hàng — Quản trị",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const customer = await getCustomerById(params.id);

  if (!customer) {
    notFound();
  }

  const roleLabel = customer.role === "ADMIN" ? "Quản trị" : "Khách hàng";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/customers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Danh sách khách hàng</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-ink-900">
              {customer.name ?? "—"}
            </h2>
            <Badge variant={customer.role === "ADMIN" ? "ink" : "default"}>
              {roleLabel}
            </Badge>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-ink-500">Email:</dt>
              <dd className="text-ink-900">{customer.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-500">SĐT:</dt>
              <dd className="text-ink-900">{customer.phone ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-500">Ngày tham gia:</dt>
              <dd className="text-ink-900">
                {formatDate(customer.createdAt, true)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1 p-4 sm:p-6">
            <p className="text-sm text-ink-500">Đơn hoàn thành</p>
            <p className="text-2xl font-semibold text-ink-900">
              {customer.completedOrderCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 p-4 sm:p-6">
            <p className="text-sm text-ink-500">Tổng chi tiêu</p>
            <p className="text-2xl font-semibold text-ink-900">
              {formatVnd(customer.totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <h3 className="text-base font-semibold text-ink-900">
            Lịch sử đơn hàng
          </h3>

          {customer.orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
              title="Chưa có đơn hàng nào"
              description="Khách hàng này chưa đặt đơn hàng nào."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                    <th className="px-3 py-3">Mã đơn</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3 text-right">Số SP</th>
                    <th className="px-3 py-3 text-right">Tổng tiền</th>
                    <th className="px-3 py-3">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
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
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={ORDER_STATUS_COLORS[order.status]}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-ink-700">
                        {order.itemCount}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-ink-900">
                        {formatVnd(order.total)}
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
