import { notFound } from "next/navigation";

import { PrintTrigger } from "@/components/admin/PrintTrigger";
import { getAdminOrderByCode } from "@/lib/queries/admin-orders";
import { requireAdmin } from "@/lib/server/user-actions";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Phiếu giao hàng" };

interface PageProps {
  params: { orderCode: string };
}

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

export default async function OrderLabelPage({ params }: PageProps) {
  await requireAdmin();

  const order = await getAdminOrderByCode(params.orderCode);
  if (!order) {
    notFound();
  }

  const address = parseShippingAddress(order.shippingAddress);
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Ecokids";
  const isCod =
    order.paymentMethod === "COD" && order.paymentStatus !== "PAID";
  const fullAddress = address
    ? [
        address.addressLine,
        address.ward,
        address.district,
        address.province,
      ]
        .filter((part) => part.trim().length > 0)
        .join(", ")
    : "";

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold text-ink-900">Phiếu giao hàng</h1>
        <PrintTrigger />
      </div>

      <div className="rounded-xl border border-ink-200 bg-white p-6 text-ink-900 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Người gửi
            </p>
            <p className="text-lg font-bold text-coral-600">{brandName}</p>
            <p className="text-xs text-ink-500">
              Thời trang trẻ em — Giao hàng tận nơi
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Ngày tạo
            </p>
            <p className="text-sm font-medium">
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="border-b border-ink-200 py-4">
          <p className="text-xs uppercase tracking-wide text-ink-500">
            Người nhận
          </p>
          <p className="text-2xl font-bold leading-tight">
            {address?.recipientName || "—"}
          </p>
          {address?.phone ? (
            <p className="text-base font-medium">{address.phone}</p>
          ) : null}
          {fullAddress ? (
            <p className="mt-1 text-sm leading-snug text-ink-700">
              {fullAddress}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-500">
              Không có thông tin địa chỉ.
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 border-b border-ink-200 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Mã đơn
            </p>
            <p className="font-mono text-2xl font-bold tracking-wide">
              {order.orderCode}
            </p>
          </div>
          {order.trackingCode ? (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-ink-500">
                Mã vận đơn
              </p>
              <p className="font-mono text-sm font-medium">
                {order.trackingCode}
              </p>
            </div>
          ) : null}
        </div>

        <div className="border-b border-ink-200 py-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">
            Sản phẩm
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase text-ink-500">
                <th className="py-1 font-medium">Tên</th>
                <th className="w-12 py-1 text-right font-medium">SL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-ink-100">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-ink-500">
                      {" "}
                      ({item.variantSize} · {item.variantColor})
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-medium">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="py-4">
          {isCod ? (
            <div className="rounded-lg border-2 border-coral-500 bg-coral-50 p-4 text-center print:bg-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-coral-600">
                Tiền thu hộ (COD)
              </p>
              <p className="text-3xl font-extrabold text-coral-600">
                {formatVnd(order.total)}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-mint-500 bg-mint-50 p-4 text-center print:bg-white">
              <p className="text-base font-bold text-mint-600">
                ĐÃ THANH TOÁN — Không thu tiền
              </p>
            </div>
          )}
        </div>

        {order.note?.trim() ? (
          <div className="border-t border-ink-200 pt-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">
              Ghi chú khách hàng
            </p>
            <p className="text-sm leading-snug text-ink-700">{order.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
