"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  ShoppingBag,
  Star,
  Ticket,
  Users,
  Warehouse,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutFormAction } from "@/lib/server/auth-actions";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/categories", label: "Danh mục", icon: FolderTree },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/returns", label: "Trả hàng", icon: RotateCcw },
  { href: "/admin/inventory", label: "Tồn kho", icon: Warehouse },
  { href: "/admin/vouchers", label: "Mã giảm giá", icon: Ticket },
  { href: "/admin/flash-sales", label: "Flash Sale", icon: Zap },
  { href: "/admin/banners", label: "Banner", icon: ImageIcon },
  { href: "/admin/customers", label: "Khách hàng", icon: Users },
  { href: "/admin/reviews", label: "Đánh giá", icon: Star },
  { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
];

function getInitials(name: string | null, email: string): string {
  const source = (name?.trim() || email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || source[0]!.toUpperCase();
}

export interface SidebarProps {
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const displayName = user.name?.trim() || user.email;

  return (
    <aside
      className="hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:sticky lg:top-0 lg:flex"
      aria-label="Điều hướng trang quản trị"
    >
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-5 py-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-base font-semibold text-ink-900"
        >
          <span className="font-display text-coral-600">Ecokids</span>
        </Link>
        <Badge variant="coral">Admin</Badge>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-coral-50 text-coral-600"
                      : "text-ink-700 hover:bg-cream-100",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ink-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar
            size="sm"
            src={user.avatarUrl}
            alt={displayName}
            fallback={getInitials(user.name, user.email)}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
          </div>
        </div>
        <form action={signOutFormAction} className="mt-2">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-ink-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Đăng xuất
          </Button>
        </form>
      </div>
    </aside>
  );
}
