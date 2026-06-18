import { z } from 'zod';

const orderItemSchema = z.object({
  variantId: z.string().min(1, 'Variant không hợp lệ'),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1'),
});

const shippingAddressSchema = z.object({
  recipientName: z
    .string()
    .min(2, 'Tên người nhận tối thiểu 2 ký tự')
    .max(100, 'Tên người nhận tối đa 100 ký tự'),
  phone: z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
  province: z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  provinceCode: z.string().min(1, 'Mã tỉnh/thành phố không hợp lệ'),
  district: z.string().min(1, 'Vui lòng chọn quận/huyện'),
  districtCode: z.string().min(1, 'Mã quận/huyện không hợp lệ'),
  ward: z.string().min(1, 'Vui lòng chọn phường/xã'),
  wardCode: z.string().min(1, 'Mã phường/xã không hợp lệ'),
  addressLine: z
    .string()
    .min(5, 'Địa chỉ chi tiết tối thiểu 5 ký tự')
    .max(255, 'Địa chỉ chi tiết tối đa 255 ký tự'),
});

export const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Giỏ hàng đang trống'),
  shippingAddress: shippingAddressSchema,
  // GĐ1 checkout offers COD + PayOS only (BANK_TRANSFER kept for legacy orders).
  paymentMethod: z.enum(['COD', 'PAYOS']),
  note: z.string().max(500).optional(),
  saveAddress: z.boolean().default(false),
  voucherCode: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim().toUpperCase() : undefined)),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
