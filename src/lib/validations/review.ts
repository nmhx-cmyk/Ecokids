import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Thiếu mã sản phẩm"),
  rating: z
    .number({ invalid_type_error: "Vui lòng chọn số sao" })
    .int()
    .min(1, "Vui lòng chọn số sao")
    .max(5, "Đánh giá tối đa 5 sao"),
  title: z
    .string()
    .max(120, "Tiêu đề tối đa 120 ký tự")
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  comment: z
    .string()
    .min(10, "Nội dung đánh giá tối thiểu 10 ký tự")
    .max(2000, "Nội dung đánh giá tối đa 2000 ký tự"),
  images: z
    .array(z.string().url())
    .max(5, "Tối đa 5 ảnh cho mỗi đánh giá")
    .optional()
    .default([]),
});

export const MAX_REVIEW_IMAGES = 5;

export const adminReplySchema = z.object({
  reviewId: z.string().min(1, "Thiếu mã đánh giá"),
  reply: z
    .string()
    .min(1, "Nội dung phản hồi không được để trống")
    .max(1000, "Phản hồi tối đa 1000 ký tự"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type AdminReplyInput = z.infer<typeof adminReplySchema>;
