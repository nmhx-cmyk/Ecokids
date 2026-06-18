"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type AccountTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const ACCOUNT_TABS: AccountTab[] = [
  { href: "/account", label: "Thông tin", icon: UserRound, exact: true },
  { href: "/account/addresses", label: "Địa chỉ", icon: MapPin },
  { href: "/account/orders", label: "Đơn hàng", icon: ShoppingBag },
];

export function AccountNav() {
  const pathname = usePathname();

  const isActive = (tab: AccountTab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <nav aria-label="Tài khoản">
      {/* Mobile: horizontal scroll */}
      <ul className="flex gap-2 overflow-x-auto border-b border-ink-200 lg:hidden">
        {ACCOUNT_TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-coral-500 text-coral-600"
                    : "border-transparent text-ink-500 hover:text-ink-900",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: vertical sidebar */}
      <ul className="hidden flex-col gap-1 lg:flex">
        {ACCOUNT_TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-coral-50 text-coral-600"
                    : "text-ink-700 hover:bg-cream-100",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
