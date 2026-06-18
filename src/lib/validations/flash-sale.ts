import { z } from "zod";

export const flashSaleItemSchema = z.object({
  productId: z.string().min(1, "Thiếu sản phẩm"),
  salePrice: z.coerce
    .number({ invalid_type_error: "Giá sale phải là số" })
    .int("Giá sale phải là số nguyên")
    .positive("Giá sale phải lớn hơn 0"),
});

export const flashSaleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Tên chương trình tối thiểu 2 ký tự")
      .max(100, "Tên tối đa 100 ký tự"),
    startsAt: z.coerce.date({ invalid_type_error: "Ngày bắt đầu không hợp lệ" }),
    endsAt: z.coerce.date({ invalid_type_error: "Ngày kết thúc không hợp lệ" }),
    isActive: z.boolean().default(true),
    items: z
      .array(flashSaleItemSchema)
      .min(1, "Cần ít nhất 1 sản phẩm trong chương trình"),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endsAt"],
  });

export type FlashSaleInput = z.infer<typeof flashSaleSchema>;
export type FlashSaleItemInput = z.infer<typeof flashSaleItemSchema>;
