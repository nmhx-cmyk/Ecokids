import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

import { BankTransferInstructions } from "@/components/account/BankTransferInstructions";
import { CancelOrderDialog } from "@/components/account/CancelOrderDialog";
import { OrderStatusTimeline } from "@/components/account/OrderStatusTimeline";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@/lib/constants/order-status";
import { getOrderByCode } from "@/lib/queries/orders";
import { requireUser } from "@/lib/server/user-actions";
import { formatDate, formatPhoneVn, formatVnd } from "@/lib/utils/format";

interface PageProps {
  params: { orderCode: string };
}

interface ShippingAddressShape {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  "default" | "coral" | "mint" | "danger" | "warning" | "ink"
> = {
  UNPAID: "warning",
  PAID: "mint",
  REFUNDED: "default",
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: `Đơn hàng ${params.orderCode} | Ecokids`,
    robots: { index: false },
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const user = await requireUser(`/account/orders/${params.orderCode}`);
  const order = await getOrderByCode(params.orderCode, user.id);

  if (!order) {
    notFound();
  }

  const address = order.shippingAddress as unknown as ShippingAddressShape;
  const formattedAddress = [
    address.addressLine,
    address.ward,
    address.district,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");

  const showBankInfo =
    order.paymentMethod === "BANK_TRANSFER" &&
    order.paymentStatus === "UNPAID";

  const canCancel = order.status === "PENDING";

  return (
    <div className="mx-auto max-w-4xl py-8">
      <Link
        href="/account/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-500 transition-colors hover:text-coral-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Quay lại danh sách đơn
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-semibold text-ink-900 sm:text-2xl">
            <span>Đơn hàng</span>
            <span className="font-mono text-coral-600">{order.orderCode}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Đặt ngày {formatDate(order.createdAt, true)}
          </p>
        </div>
        <Badge variant={ORDER_STATUS_COLORS[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </header>

      <section className="mb-6">
        <OrderStatusTimeline status={order.status} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-ink-100">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="h-[80px] w-[60px] flex-shrink-0 overflow-hidden rounded-md border border-ink-100 bg-cream-100">
                      {item.productImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          width={60}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="text-sm font-medium text-ink-900 hover:text-coral-600"
                      >
                        {item.productName}
                      </Link>
                      <span className="text-xs text-ink-500">
                        {item.variantSize} · {item.variantColor}
                      </span>
                      <span className="text-xs text-ink-500">
                        SL {item.quantity} × {formatVnd(item.unitPrice)}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-ink-900">
                      {formatVnd(item.subtotal)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Địa chỉ giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-ink-900">
                  {address.recipientName}
                </p>
                <p className="text-ink-700">
                  {formatPhoneVn(address.phone)}
                </p>
                <p className="text-ink-700">{formattedAddress}</p>
              </div>
              {order.note ? (
                <p className="mt-3 rounded-lg bg-cream-50 px-3 py-2 text-sm italic text-ink-700">
                  Ghi chú: {order.note}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Phương thức
                  </dt>
                  <dd className="mt-1 text-sm text-ink-900">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Tình trạng
                  </dt>
                  <dd className="mt-1">
                    <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <dl className="space-y-2 border-t border-ink-100 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Tạm tính</dt>
                  <dd className="text-ink-900">
                    {formatVnd(order.subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Phí vận chuyển</dt>
                  <dd className="text-ink-900">
                    {formatVnd(order.shippingFee)}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-base font-semibold">
                  <dt className="text-ink-900">Tổng cộng</dt>
                  <dd className="text-coral-600">{formatVnd(order.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {showBankInfo ? <BankTransferInstructions order={order} /> : null}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canCancel ? <CancelOrderDialog orderCode={order.orderCode} /> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href="/contact">Liên hệ hỗ trợ</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
