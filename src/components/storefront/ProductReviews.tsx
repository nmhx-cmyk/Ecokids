"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BadgeCheck, ImagePlus, MessageSquare, Star, X } from "lucide-react";

import { StarRating, StarRatingInput } from "@/components/storefront/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { createReview, deleteReview, updateReview } from "@/lib/server/reviews";
import { formatDate } from "@/lib/utils/format";
import type { PublicReview, ReviewSummary, MyReview } from "@/lib/queries/reviews";

const formSchema = z.object({
  rating: z.number().int().min(1, "Vui lòng chọn số sao").max(5),
  title: z.string().max(120, "Tiêu đề tối đa 120 ký tự"),
  comment: z
    .string()
    .min(10, "Nội dung tối thiểu 10 ký tự")
    .max(2000, "Nội dung tối đa 2000 ký tự"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductReviewsProps {
  productId: string;
  summary: ReviewSummary;
  reviews: PublicReview[];
  isLoggedIn: boolean;
  myReview: MyReview | null;
  userId: string | null;
}

const MAX_IMAGES = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const STATUS_HINT: Record<MyReview["status"], string> = {
  PENDING: "Đánh giá của bạn đang chờ duyệt.",
  APPROVED: "Đánh giá của bạn đã được duyệt.",
  REJECTED: "Đánh giá của bạn đã bị từ chối.",
};

export function ProductReviews({
  productId,
  summary,
  reviews,
  isLoggedIn,
  myReview,
  userId,
}: ProductReviewsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState<string[]>(myReview?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = myReview !== null;

  const handleUpload = async (files: FileList) => {
    if (!userId) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    const chosen = Array.from(files).slice(0, room);
    setUploading(true);
    try {
      for (const file of chosen) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          toast.error("Chỉ chấp nhận ảnh JPG, PNG, WebP");
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", "product-images");
        fd.append("pathPrefix", `reviews/${userId}`);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { ok: boolean; url?: string };
        if (!res.ok || !data.url) {
          toast.error("Tải ảnh thất bại");
          continue;
        }
        setImages((prev) => [...prev, data.url!]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: myReview?.rating ?? 0,
      title: myReview?.title ?? "",
      comment: myReview?.comment ?? "",
    },
  });

  const rating = watch("rating");

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      productId,
      rating: values.rating,
      title: values.title.trim() || null,
      comment: values.comment.trim(),
      images,
    };
    const result = isEditing
      ? await updateReview(myReview.id, payload)
      : await createReview(payload);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      isEditing
        ? "Đã cập nhật đánh giá, chờ duyệt lại."
        : "Cảm ơn bạn! Đánh giá đang chờ duyệt.",
    );
    router.refresh();
  });

  const onDelete = async () => {
    if (!myReview) return;
    setDeleting(true);
    const result = await deleteReview(myReview.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Đã xoá đánh giá");
    router.refresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* Summary */}
      <div className="space-y-4">
        <div className="rounded-xl border border-ink-200 bg-white p-5 text-center">
          <p className="font-display text-4xl font-bold text-ink-900">
            {summary.average.toFixed(1)}
          </p>
          <StarRating value={summary.average} size="md" className="mt-1 justify-center" />
          <p className="mt-1 text-xs text-ink-500">{summary.count} đánh giá</p>
        </div>
        <ul className="space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[star];
            const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
            return (
              <li key={star} className="flex items-center gap-2 text-xs text-ink-600">
                <span className="w-3 text-right">{star}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-6 text-right tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Form + list */}
      <div className="space-y-6">
        {isLoggedIn ? (
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-ink-200 bg-cream-50 p-5"
            noValidate
          >
            <h3 className="mb-3 text-sm font-semibold text-ink-900">
              {isEditing ? "Chỉnh sửa đánh giá của bạn" : "Viết đánh giá"}
            </h3>
            {myReview ? (
              <p className="mb-3 text-xs text-ink-500">{STATUS_HINT[myReview.status]}</p>
            ) : null}

            <FormField label="Đánh giá" required error={errors.rating?.message}>
              <StarRatingInput
                value={rating}
                onChange={(v) =>
                  setValue("rating", v, { shouldValidate: true })
                }
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Tiêu đề" htmlFor="review-title" error={errors.title?.message}>
              <Input
                id="review-title"
                {...register("title")}
                error={Boolean(errors.title)}
                placeholder="Tóm tắt cảm nhận (không bắt buộc)"
              />
            </FormField>

            <FormField
              label="Nội dung"
              htmlFor="review-comment"
              required
              error={errors.comment?.message}
            >
              <Textarea
                id="review-comment"
                rows={4}
                {...register("comment")}
                error={Boolean(errors.comment)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              />
            </FormField>

            <FormField label={`Ảnh (tối đa ${MAX_IMAGES})`}>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div
                    key={url}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-ink-200"
                  >
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((p) => p.filter((u) => u !== url))}
                      aria-label="Xoá ảnh"
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900/70 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 text-ink-500 hover:bg-cream-100 disabled:opacity-50"
                  >
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[10px]">{uploading ? "Đang tải" : "Thêm"}</span>
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void handleUpload(e.target.files);
                }}
              />
            </FormField>

            <div className="flex items-center justify-end gap-2 pt-2">
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDelete}
                  loading={deleting}
                >
                  Xoá đánh giá
                </Button>
              ) : null}
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Cập nhật" : "Gửi đánh giá"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-ink-200 bg-cream-50 p-5 text-sm text-ink-600">
            <Link href="/login" className="font-medium text-coral-600 hover:underline">
              Đăng nhập
            </Link>{" "}
            để viết đánh giá cho sản phẩm này.
          </div>
        )}

        {reviews.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" strokeWidth={1.5} />}
            title="Chưa có đánh giá"
            description="Hãy là người đầu tiên đánh giá sản phẩm này."
          />
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-ink-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">
                      {r.authorName}
                    </span>
                    {r.isVerified ? (
                      <Badge variant="mint" className="gap-1">
                        <BadgeCheck className="h-3 w-3" /> Đã mua hàng
                      </Badge>
                    ) : null}
                  </div>
                  <time className="text-xs text-ink-500">
                    {formatDate(r.createdAt)}
                  </time>
                </div>
                <StarRating value={r.rating} size="sm" className="mt-1.5" />
                {r.title ? (
                  <p className="mt-2 text-sm font-semibold text-ink-900">{r.title}</p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                  {r.comment}
                </p>
                {r.images.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.images.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative h-16 w-16 overflow-hidden rounded-lg border border-ink-200"
                      >
                        <Image
                          src={url}
                          alt="Ảnh đánh giá"
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                {r.adminReply ? (
                  <div className="mt-3 rounded-lg border border-coral-200 bg-coral-50 p-3">
                    <p className="text-xs font-semibold text-coral-700">
                      Phản hồi từ Ecokids
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                      {r.adminReply}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
