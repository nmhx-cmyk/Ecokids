import type { DiscountType } from "@prisma/client";

/**
 * Effective unit price for an item, accounting for variant-level overrides and
 * an active flash-sale price. All values are integer VND.
 */
export function effectiveUnitPrice(
  basePrice: number,
  variantPrice: number | null,
  flashSalePrice: number | null,
): number {
  const regular = variantPrice ?? basePrice;
  if (flashSalePrice !== null && flashSalePrice < regular) {
    return flashSalePrice;
  }
  return regular;
}

export interface VoucherRule {
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
}

/**
 * Computes the discount amount (integer VND) a voucher yields for a given
 * subtotal. Returns 0 when the subtotal does not meet `minOrderValue`. The
 * result never exceeds the subtotal.
 */
export function computeVoucherDiscount(
  voucher: VoucherRule,
  subtotal: number,
): number {
  if (subtotal < voucher.minOrderValue) return 0;

  let discount: number;
  if (voucher.discountType === "PERCENT") {
    discount = Math.floor((subtotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount !== null) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else {
    discount = voucher.discountValue;
  }

  return Math.max(0, Math.min(discount, subtotal));
}
