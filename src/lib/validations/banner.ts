import { z } from "zod";

export const bannerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Tiêu đề tối thiểu 2 ký tự")
    .max(100, "Tiêu đề tối đa 100 ký tự"),
  imageUrl: z.string().url("Vui lòng tải ảnh banner"),
  // Accept absolute URLs or in-site paths (e.g. /products?category=...).
  linkUrl: z
    .string()
    .trim()
    .max(500, "Đường dẫn quá dài")
    .nullish()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type BannerInput = z.infer<typeof bannerSchema>;

export const reorderBannersSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type ReorderBannersInput = z.infer<typeof reorderBannersSchema>;
