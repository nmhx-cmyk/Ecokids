import Image from "next/image";
import Link from "next/link";
import { MessageSquareText, Star } from "lucide-react";
import { ReviewStatus } from "@prisma/client";

import { ReviewModerationActions } from "@/components/admin/ReviewModerationActions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminReviews } from "@/lib/queries/reviews";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Đánh giá",
};

const FILTERS: { value: ReviewStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "ALL", label: "Tất cả" },
];

const STATUS_BADGE: Record<
  ReviewStatus,
  { label: string; variant: "warning" | "mint" | "danger" }
> = {
  PENDING: { label: "Chờ duyệt", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "mint" },
  REJECTED: { label: "Đã từ chối", variant: "danger" },
};

interface PageProps {
  searchParams: { status?: string; page?: string };
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const statusParam = searchParams.status;
  const status =
    statusParam && statusParam in ReviewStatus
      ? (statusParam as ReviewStatus)
      : statusParam === "ALL"
        ? undefined
        : ReviewStatus.PENDING;
  const activeFilter = statusParam === "ALL" ? "ALL" : (status ?? "PENDING");
  const page = Math.max(1, Number(searchParams.page) || 1);

  const { reviews, pendingCount } = await getAdminReviews({ status, page });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">Đánh giá sản phẩm</h2>
        <p className="mt-1 text-sm text-ink-500">
          Duyệt, từ chối và phản hồi đánh giá của khách hàng.
          {pendingCount > 0 ? (
            <span className="ml-1 font-medium text-warning">
              {pendingCount} đang chờ duyệt.
            </span>
          ) : null}
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/reviews?status=${f.value}`}
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

      {reviews.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />}
            title="Không có đánh giá"
            description="Chưa có đánh giá nào trong nhóm này."
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <Card key={r.id} className="p-4">
                <li className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900">
                        {r.rating}
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {r.isVerified ? <Badge variant="mint">Đã mua hàng</Badge> : null}
                    </div>
                    <time className="text-xs text-ink-500">
                      {formatDate(r.createdAt, true)}
                    </time>
                  </div>

                  <div className="text-sm">
                    <p className="text-ink-500">
                      {r.authorName} ({r.authorEmail}) ·{" "}
                      <Link
                        href={`/products/${r.productSlug}`}
                        className="text-coral-600 hover:underline"
                        target="_blank"
                      >
                        {r.productName}
                      </Link>
                    </p>
                    {r.title ? (
                      <p className="mt-1 font-medium text-ink-900">{r.title}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-ink-700">{r.comment}</p>
                    {r.images.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.images.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-14 w-14 overflow-hidden rounded-md border border-ink-200"
                          >
                            <Image src={url} alt="" fill sizes="56px" className="object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {r.adminReply ? (
                      <p className="mt-2 rounded-lg bg-cream-100 p-2 text-xs text-ink-600">
                        <span className="font-semibold">Phản hồi shop:</span>{" "}
                        {r.adminReply}
                      </p>
                    ) : null}
                  </div>

                  <ReviewModerationActions
                    reviewId={r.id}
                    status={r.status}
                    currentReply={r.adminReply}
                  />
                </li>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
