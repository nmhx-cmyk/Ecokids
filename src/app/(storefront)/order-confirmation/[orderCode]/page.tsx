import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Banknote, CheckCircle2, Clock, QrCode } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { CopyButton } from "@/components/storefront/CopyButton";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants/payment";
import { BANK_INFO } from "@/lib/constants/shipping";
import { formatDate, formatPhoneVn, formatVnd } from "@/lib/utils/format";
import { getOrderByCode } from "@/lib/queries/orders";
import { reconcilePayosOrderFromProvider } from "@/lib/server/payos-payment";
import { requireUser } from "@/lib/server/user-actions";
import { buildBankTransferContent } from "@/lib/utils/transfer-content";

interface PageProps {
  params: { orderCode: string };
  searchParams: {
    payos?: string;
    code?: string;
    status?: string;
    cancel?: string;
  };
}

interface ShippingAddressShape {
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: `Xác nhận đơn hàng ${params.orderCode} | Ecokids`,
    robots: { index: false },
  };
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireUser(`/order-confirmation/${params.orderCode}`);
  let order = await getOrderByCode(params.orderCode, user.id);

  if (!order) {
    notFound();
  }

  const payosSuccessReturn =
    searchParams?.payos === "return" &&
    searchParams?.code === "00" &&
    searchParams?.status === "PAID" &&
    searchParams?.cancel !== "true";

  if (
    payosSuccessReturn &&
    order.paymentMethod === "PAYOS" &&
    order.paymentStatus === "UNPAID"
  ) {
    try {
      const reconciledOrderCode = await reconcilePayosOrderFromProvider(
        order.orderCode,
        user.id,
      );
      if (reconciledOrderCode) {
        const refreshed = await getOrderByCode(params.orderCode, user.id);
        if (refreshed) order = refreshed;
      }
    } catch (error) {
      console.error("[order-confirmation] PayOS reconciliation failed", error);
    }
  }

  const payosAwaitingPayment =
    order.paymentMethod === "PAYOS" &&
    order.paymentStatus === "UNPAID" &&
    order.status !== "CANCELED";
  const payosCancelReturn = searchParams?.payos === "cancel";

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

  const transferContent = buildBankTransferContent(
    order.orderCode,
    address.recipientName,
  );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      {payosAwaitingPayment ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center lg:p-8">
          <Clock
            className="mx-auto mb-3 size-12 text-warning"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-semibold text-ink-900">
            Đơn hàng chờ thanh toán
          </h1>
          <p className="mt-2 text-ink-700">
            Đơn của bạn đã được tạo. Vui lòng hoàn tất thanh toán PayOS để chúng
            tôi xác nhận đơn.
          </p>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border border-mint-200 bg-mint-50 p-6 text-center lg:p-8">
          <CheckCircle2
            className="mx-auto mb-3 size-12 text-mint-600"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-semibold text-ink-900">
            Đặt hàng thành công!
          </h1>
          <p className="mt-2 text-ink-700">
            Cảm ơn bạn đã đặt hàng. Đơn hàng của bạn đã được ghi nhận.
          </p>
        </section>
      )}

      <section className="mb-6 flex flex-col items-center gap-2 text-center sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
          Mã đơn hàng
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl text-coral-600">
            {order.orderCode}
          </span>
          <CopyButton
            value={order.orderCode}
            label="Sao chép mã đơn hàng"
          />
        </div>
      </section>

      {payosAwaitingPayment ? (
        <Card className="mb-6">
          <CardHeader className="flex-row items-center gap-2">
            <QrCode className="h-5 w-5 text-coral-600" aria-hidden="true" />
            <CardTitle>Thanh toán online PayOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payosCancelReturn ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-warning">
                Bạn đã hủy thanh toán. Đơn hàng vẫn được giữ — bạn có thể thanh
                toán lại bên dưới.
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink-500">Số tiền cần thanh toán</span>
              <span className="text-lg font-semibold text-coral-600">
                {formatVnd(order.total)}
              </span>
            </div>
            {order.paymentExpiresAt ? (
              <p className="text-xs text-ink-500">
                Vui lòng thanh toán trước{" "}
                <span className="font-medium text-ink-700">
                  {formatDate(order.paymentExpiresAt, true)}
                </span>
                . Sau thời gian này, đơn sẽ tự động hủy và hoàn lại hàng vào kho.
              </p>
            ) : null}
            {order.paymentCheckoutUrl ? (
              <Button asChild size="lg" className="w-full">
                <a href={order.paymentCheckoutUrl}>Thanh toán ngay</a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showBankInfo ? (
        <Card className="mb-6">
          <CardHeader className="flex-row items-center gap-2">
            <Banknote className="h-5 w-5 text-coral-600" aria-hidden="true" />
            <CardTitle>Thông tin chuyển khoản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="divide-y divide-ink-100">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-ink-500">Ngân hàng</dt>
                <dd className="text-sm font-medium text-ink-900">
                  {BANK_INFO.bankName}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-ink-500">Số tài khoản</dt>
                <dd className="flex items-center gap-2 text-sm font-medium text-ink-900">
                  <span className="font-mono">{BANK_INFO.accountNumber}</span>
                  <CopyButton
                    value={BANK_INFO.accountNumber}
                    label="Sao chép số tài khoản"
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-ink-500">Chủ tài khoản</dt>
                <dd className="text-sm font-medium text-ink-900">
                  {BANK_INFO.accountHolder}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-sm text-ink-500">Số tiền</dt>
                <dd className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <span>{formatVnd(order.total)}</span>
                  <CopyButton
                    value={String(order.total)}
                    label="Sao chép số tiền"
                  />
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-coral-200 bg-coral-50 p-4">
              <p className="text-sm font-medium text-ink-900">
                Nội dung chuyển khoản — vui lòng ghi đúng để đơn hàng được xác
                nhận nhanh nhất:
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-cream-100 p-3">
                <code className="break-all font-mono text-base font-semibold text-ink-900">
                  {transferContent}
                </code>
                <CopyButton
                  value={transferContent}
                  label="Sao chép nội dung chuyển khoản"
                />
              </div>
            </div>

            <p className="text-xs text-ink-500">
              Đơn hàng sẽ tự động được xác nhận sau khi nhận được tiền (thường
              trong vòng 1-2 giờ). Nếu chưa thấy cập nhật sau 24h, vui lòng liên
              hệ với chúng tôi.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tóm tắt đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Ngày đặt
              </dt>
              <dd className="mt-1 text-sm text-ink-900">
                {formatDate(order.createdAt, true)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Phương thức thanh toán
              </dt>
              <dd className="mt-1 text-sm text-ink-900">
                {PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Tình trạng thanh toán
              </dt>
              <dd className="mt-1">
                <Badge variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}>
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </Badge>
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">
              Giao đến
            </h3>
            <div className="rounded-lg border border-ink-100 bg-cream-50 p-3 text-sm text-ink-700">
              <p className="font-medium text-ink-900">
                {address.recipientName}
              </p>
              <p>{formatPhoneVn(address.phone)}</p>
              <p>{formattedAddress}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-900">
              Sản phẩm
            </h3>
            <ul className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="h-[60px] w-12 flex-shrink-0 overflow-hidden rounded-md bg-cream-100">
                    {item.productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                        width={48}
                        height={60}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-ink-900">
                      {item.productName}
                    </span>
                    <span className="text-xs text-ink-500">
                      {item.variantSize} · {item.variantColor} · SL{" "}
                      {item.quantity}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-ink-900">
                    {formatVnd(item.subtotal)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <dl className="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Tạm tính</dt>
              <dd className="text-ink-900">{formatVnd(order.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Phí vận chuyển</dt>
              <dd className="text-ink-900">{formatVnd(order.shippingFee)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-base font-semibold">
              <dt className="text-ink-900">Tổng cộng</dt>
              <dd className="text-coral-600">{formatVnd(order.total)}</dd>
            </div>
          </dl>

          {order.note ? (
            <p className="text-sm italic text-ink-700">
              Ghi chú: {order.note}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild variant="outline">
          <Link href={`/account/orders/${order.orderCode}`}>
            Xem chi tiết đơn hàng
          </Link>
        </Button>
        <Button asChild variant="primary">
          <Link href="/products">Tiếp tục mua sắm</Link>
        </Button>
      </div>
    </div>
  );
}
