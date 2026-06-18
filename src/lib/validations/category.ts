import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CUID_REGEX = /^c[a-z0-9]{20,}$/i;

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, 'Tên danh mục tối thiểu 2 ký tự')
    .max(100, 'Tên danh mục tối đa 100 ký tự'),
  slug: z
    .string()
    .min(2, 'Slug tối thiểu 2 ký tự')
    .max(100, 'Slug tối đa 100 ký tự')
    .regex(SLUG_REGEX, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  parentId: z
    .string()
    .regex(CUID_REGEX, 'ID danh mục cha không hợp lệ')
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? null : value)),
  imageUrl: z
    .string()
    .url('URL hình ảnh không hợp lệ')
    .nullable()
    .optional()
    .transform((value) => (value === undefined || value === '' ? null : value)),
  sortOrder: z
    .number({ invalid_type_error: 'Thứ tự sắp xếp phải là số' })
    .int('Thứ tự sắp xếp phải là số nguyên')
    .min(0, 'Thứ tự sắp xếp không thể âm')
    .default(0),
});

export const categoryUpdateSchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
