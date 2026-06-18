import Link from "next/link";
import { PackageX } from "lucide-react";
import { ReturnStatus } from "@prisma/client";

import { ReturnActions } from "@/components/admin/ReturnActions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getReturnRequests } from "@/lib/queries/returns";
import { formatDate, formatVnd } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Trả hàng" };

const FILTERS: { value: ReturnStatus | "ALL"; label: string }[] = [
  { value: "REQUESTED", label: "Chờ xử lý" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REFUNDED", label: "Đã hoàn tiền" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "ALL", label: "Tất cả" },
];

const STATUS_BADGE: Record<
  ReturnStatus,
  { label: string; variant: "warning" | "coral" | "mint" | "danger" }
> = {
  REQUESTED: { label: "Chờ xử lý", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "coral" },
  REFUNDED: { label: "Đã hoàn tiền", variant: "mint" },
  REJECTED: { label: "Từ chối", variant: "danger" },
};

interface PageProps {
  searchParams: { status?: string };
}

export default async function AdminReturnsPage({ searchParams }: PageProps) {
  const statusParam = searchParams.status;
  const status =
    statusParam && statusParam in ReturnStatus
      ? (statusParam as ReturnStatus)
      : statusParam === "ALL"
        ? undefined
        : ReturnStatus.REQUESTED;
  const activeFilter = statusParam === "ALL" ? "ALL" : (status ?? "REQUESTED");

  const requests = await getReturnRequests(status);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">Yêu cầu trả hàng</h2>
        <p className="mt-1 text-sm text-ink-500">
          Duyệt và xử lý hoàn tiền cho các đơn đã hoàn thành.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/returns?status=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              activeFilter === f.value
                ? "border-coral-500 bg-coral-50 text-coral-600"
                : "border-ink-200 text-ink-600 hover:bg-cream-100",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PackageX className="h-5 w-5" aria-hidden="true" />}
            title="Không có yêu cầu"
            description="Chưa có yêu cầu trả hàng nào trong nhóm này."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <Card key={r.id} className="p-4">
                <li className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${r.orderCode}`}
                        className="font-mono text-sm font-medium text-coral-600 hover:underline"
                      >
                        {r.orderCode}
                      </Link>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-sm text-ink-500">
                        {formatVnd(r.orderTotal)}
                      </span>
                    </div>
                    <time className="text-xs text-ink-500">
                      {formatDate(r.createdAt, true)}
                    </time>
                  </div>
                  <p className="text-sm text-ink-500">
                    {r.customerName} ({r.customerEmail})
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg bg-cream-100 p-3 text-sm text-ink-700">
                    {r.reason}
                  </p>
                  {r.adminNote ? (
                    <p className="text-xs text-ink-500">
                      <span className="font-semibold">Ghi chú xử lý:</span> {r.adminNote}
                    </p>
                  ) : null}
                  <ReturnActions returnId={r.id} status={r.status} />
                </li>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
