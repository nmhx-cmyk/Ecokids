import { z } from "zod";

export const requestReturnSchema = z.object({
  orderCode: z.string().min(1, "Thiếu mã đơn hàng"),
  reason: z
    .string()
    .trim()
    .min(10, "Lý do trả hàng tối thiểu 10 ký tự")
    .max(1000, "Lý do tối đa 1000 ký tự"),
});

export type RequestReturnInput = z.infer<typeof requestReturnSchema>;

export const RETURN_ACTIONS = ["APPROVED", "REJECTED", "REFUNDED"] as const;
export type ReturnAction = (typeof RETURN_ACTIONS)[number];
