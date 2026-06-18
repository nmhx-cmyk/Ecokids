export const DEFAULT_SHIPPING_FEE = Number(process.env.NEXT_PUBLIC_SHIPPING_FEE ?? 30000);

// Alias used by storefront cart/checkout flows.
export const SHIPPING_FEE = DEFAULT_SHIPPING_FEE;

export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 500000,
);

export const BANK_INFO = {
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? 'Vietcombank',
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? '',
  accountHolder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ?? '',
} as const;
