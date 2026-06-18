import Link from "next/link";
import { AlertCircle } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/constants/order-status";
import type { OrderWithItems } from "@/lib/queries/orders";
import { formatDate, formatVnd } from "@/lib/utils/format";

const MAX_THUMBS = 3;

interface OrderListItemProps {
  order: OrderWithItems;
}

export function OrderListItem({ order }: OrderListItemProps) {
  const visibleItems = order.items.slice(0, MAX_THUMBS);
  const remaining = Math.max(0, order.items.length - MAX_THUMBS);
  const showPaymentWarning =
    (order.paymentMethod === "BANK_TRANSFER" ||
      order.paymentMethod === "PAYOS") &&
    order.paymentStatus === "UNPAID" &&
    order.status !== "CANCELED";

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-semibold text-ink-900">
            {order.orderCode}
          </span>
          <span className="text-xs text-ink-500">
            {formatDate(order.createdAt)}
          </span>
        </div>
        <Badge variant={ORDER_STATUS_COLORS[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {showPaymentWarning ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-warning">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>Chờ thanh toán</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border border-ink-100 bg-cream-100"
              title={item.productName}
            >
              {item.productImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.productImage}
                  alt={item.productName}
                  width={48}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ))}
          {remaining > 0 ? (
            <span className="text-xs text-ink-500">
              và {remaining} sản phẩm khác
            </span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-0">
        <div className="flex flex-col">
          <span className="text-xs text-ink-500">Tổng tiền</span>
          <span className="text-base font-semibold text-coral-600">
            {formatVnd(order.total)}
          </span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/account/orders/${order.orderCode}`}>
            Xem chi tiết
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
