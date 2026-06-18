import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { OrderStatus } from "@prisma/client";

import { OrderListItem } from "@/components/account/OrderListItem";
import {
  OrderStatusTabs,
  type OrderStatusTab,
} from "@/components/account/OrderStatusTabs";
import {
  Button,
  EmptyState,
  Pagination,
} from "@/components/ui";
import { getMyOrders } from "@/lib/queries/orders";
import { requireUser } from "@/lib/server/user-actions";

export const metadata: Metadata = {
  title: "Đơn hàng của tôi",
};

interface PageProps {
  searchParams: { status?: string; page?: string };
}

const STATUS_VALUES: OrderStatusTab[] = [
  "all",
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPING",
  "COMPLETED",
  "CANCELED",
];

function parseTab(input: string | undefined): OrderStatusTab {
  if (!input) return "all";
  return (STATUS_VALUES as string[]).includes(input)
    ? (input as OrderStatusTab)
    : "all";
}

function parsePage(input: string | undefined): number {
  const n = Number(input);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function MyOrdersPage({ searchParams }: PageProps) {
  const user = await requireUser("/account/orders");
  const activeTab = parseTab(searchParams.status);
  const page = parsePage(searchParams.page);

  const statusFilter: OrderStatus | undefined =
    activeTab === "all" ? undefined : (activeTab as OrderStatus);

  const { items, totalPages, page: currentPage } = await getMyOrders(user.id, {
    status: statusFilter,
    page,
    pageSize: 10,
  });

  const baseUrl =
    activeTab === "all"
      ? "/account/orders"
      : `/account/orders?status=${activeTab}`;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">
          Đơn hàng của tôi
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Theo dõi và quản lý các đơn hàng bạn đã đặt.
        </p>
      </header>

      <OrderStatusTabs active={activeTab} />

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" aria-hidden="true" />}
          title="Không có đơn hàng nào"
          description="Bạn chưa có đơn hàng nào ở trạng thái này. Hãy bắt đầu khám phá các sản phẩm Ecokids."
          action={
            <Button asChild variant="primary">
              <Link href="/products">Khám phá sản phẩm</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((order) => (
              <li key={order.id}>
                <OrderListItem order={order} />
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl={baseUrl}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
