import Link from "next/link";
import { History } from "lucide-react";
import { InventoryReason } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryLogs } from "@/lib/queries/inventory";
import { formatDate } from "@/lib/utils/format";

const REASON_LABEL: Record<InventoryReason, string> = {
  MANUAL_ADD: "Nhập kho thủ công",
  MANUAL_REMOVE: "Xuất kho thủ công",
  ORDER_RESERVE: "Trừ kho do đặt hàng",
  ORDER_CANCEL: "Hoàn kho do huỷ đơn",
  STOCK_TAKE: "Kiểm kê",
};

const REASON_VARIANT: Record<
  InventoryReason,
  "default" | "coral" | "mint" | "danger" | "warning" | "ink"
> = {
  MANUAL_ADD: "mint",
  MANUAL_REMOVE: "warning",
  ORDER_RESERVE: "coral",
  ORDER_CANCEL: "default",
  STOCK_TAKE: "ink",
};

export async function InventoryLogsTable() {
  const result = await getInventoryLogs({ page: 1, pageSize: 50 });

  if (result.items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<History className="h-5 w-5" aria-hidden="true" />}
          title="Chưa có lịch sử kho"
          description="Các thao tác cập nhật tồn kho sẽ được ghi lại tại đây."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th scope="col" className="px-4 py-2">
                Thời gian
              </th>
              <th scope="col" className="px-4 py-2">
                Sản phẩm
              </th>
              <th scope="col" className="px-4 py-2">
                SKU
              </th>
              <th scope="col" className="px-4 py-2 text-right">
                Thay đổi
              </th>
              <th scope="col" className="px-4 py-2">
                Lý do
              </th>
              <th scope="col" className="px-4 py-2">
                Admin
              </th>
              <th scope="col" className="px-4 py-2">
                Ghi chú
              </th>
              <th scope="col" className="px-4 py-2">
                Mã đơn
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {result.items.map((log) => {
              const positive = log.delta > 0;
              return (
                <tr key={log.id} className="hover:bg-cream-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-700">
                    {formatDate(log.createdAt, true)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">
                      {log.productName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {log.variantSize} · {log.variantColor}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-700">
                    {log.sku}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right font-mono text-sm font-semibold " +
                      (positive
                        ? "text-mint-600"
                        : log.delta < 0
                          ? "text-danger"
                          : "text-ink-500")
                    }
                  >
                    {positive ? "+" : ""}
                    {log.delta}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={REASON_VARIANT[log.reason]}>
                      {REASON_LABEL[log.reason]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {log.adminName ?? (
                      <span className="text-ink-500">Hệ thống</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {log.note ?? <span className="text-ink-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {log.orderCode ? (
                      <Link
                        href={`/admin/orders/${log.orderCode}`}
                        className="font-mono text-xs text-coral-600 hover:underline"
                      >
                        {log.orderCode}
                      </Link>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
