import { z } from "zod";

const CODE_REGEX = /^[A-Z0-9_-]+$/;

export const voucherSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mã giảm giá tối thiểu 3 ký tự")
      .max(30, "Mã giảm giá tối đa 30 ký tự")
      .transform((v) => v.toUpperCase())
      .refine((v) => CODE_REGEX.test(v), "Mã chỉ gồm chữ HOA, số, gạch ngang/dưới"),
    description: z
      .string()
      .max(200, "Mô tả tối đa 200 ký tự")
      .nullish()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce
      .number({ invalid_type_error: "Giá trị giảm phải là số" })
      .int("Giá trị giảm phải là số nguyên")
      .positive("Giá trị giảm phải lớn hơn 0"),
    minOrderValue: z.coerce
      .number()
      .int()
      .min(0, "Giá trị đơn tối thiểu không thể âm")
      .default(0),
    maxDiscount: z.coerce
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => (v ? v : null)),
    usageLimit: z.coerce
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => (v ? v : null)),
    perUserLimit: z.coerce
      .number()
      .int()
      .positive()
      .nullish()
      .transform((v) => (v ? v : null)),
    startsAt: z.coerce.date({ invalid_type_error: "Ngày bắt đầu không hợp lệ" }),
    endsAt: z.coerce.date({ invalid_type_error: "Ngày kết thúc không hợp lệ" }),
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endsAt"],
  })
  .refine(
    (d) => d.discountType !== "PERCENT" || (d.discountValue >= 1 && d.discountValue <= 100),
    { message: "Giảm theo % phải từ 1 đến 100", path: ["discountValue"] },
  );

export type VoucherInput = z.infer<typeof voucherSchema>;

export const applyVoucherSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá"),
  subtotal: z.coerce.number().int().nonnegative(),
});

export type ApplyVoucherInput = z.infer<typeof applyVoucherSchema>;
