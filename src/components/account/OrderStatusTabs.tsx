import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export type OrderStatusTab =
  | "all"
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELED";

interface TabDef {
  value: OrderStatusTab;
  label: string;
}

const TABS: TabDef[] = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PACKING", label: "Đang đóng gói" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELED", label: "Đã hủy" },
];

interface OrderStatusTabsProps {
  active: OrderStatusTab;
}

export function OrderStatusTabs({ active }: OrderStatusTabsProps) {
  return (
    <nav aria-label="Lọc đơn hàng theo trạng thái">
      <ul className="flex gap-2 overflow-x-auto border-b border-ink-200">
        {TABS.map((tab) => {
          const isActive = tab.value === active;
          const href =
            tab.value === "all"
              ? "/account/orders"
              : `/account/orders?status=${tab.value}`;
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-coral-500 text-coral-600"
                    : "border-transparent text-ink-500 hover:text-ink-900",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
