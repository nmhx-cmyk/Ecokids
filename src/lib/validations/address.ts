import { z } from 'zod';

export const addressSchema = z.object({
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
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
