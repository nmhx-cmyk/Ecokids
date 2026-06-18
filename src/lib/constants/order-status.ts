import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELED: 'Đã hủy',
};

// Badge variant per status (maps to a UI badge component).
export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  'default' | 'coral' | 'mint' | 'danger' | 'warning' | 'ink'
> = {
  PENDING: 'warning',
  CONFIRMED: 'coral',
  PACKING: 'default',
  SHIPPING: 'ink',
  COMPLETED: 'mint',
  CANCELED: 'danger',
};

// Allowed forward transitions for the order state machine.
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PACKING', 'CANCELED'],
  PACKING: ['SHIPPING', 'CANCELED'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELED: [],
};
