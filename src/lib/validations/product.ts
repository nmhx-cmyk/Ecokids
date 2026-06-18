import { AgeRange, Gender, ProductStatus } from '@prisma/client';
import { z } from 'zod';

export const productSchema = z
  .object({
    name: z.string().min(2, 'Tên sản phẩm tối thiểu 2 ký tự').max(255),
    slug: z
      .string()
      .min(2, 'Slug tối thiểu 2 ký tự')
      .regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
    description: z.string().min(1, 'Vui lòng nhập mô tả sản phẩm'),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    ageRange: z.array(z.nativeEnum(AgeRange)).min(1, 'Chọn ít nhất 1 độ tuổi'),
    gender: z.nativeEnum(Gender),
    basePrice: z.number().int().positive('Giá phải lớn hơn 0'),
    comparePrice: z.number().int().positive().optional(),
    status: z.nativeEnum(ProductStatus),
    material: z.string().max(255).optional(),
    origin: z.string().max(255).optional(),
    careGuide: z.string().optional(),
  })
  .refine(
    (data) => data.comparePrice === undefined || data.comparePrice > data.basePrice,
    {
      message: 'Giá so sánh phải lớn hơn giá bán',
      path: ['comparePrice'],
    },
  );

export const variantSchema = z.object({
  sku: z.string().min(1, 'SKU không được để trống').max(64),
  size: z.string().min(1, 'Vui lòng nhập size').max(32),
  sizeNote: z.string().max(255).optional(),
  color: z.string().min(1, 'Vui lòng nhập màu').max(64),
  colorHex: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Mã màu hex không hợp lệ')
    .optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0, 'Tồn kho không thể âm'),
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
