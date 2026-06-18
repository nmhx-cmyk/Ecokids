import { LogOut } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { signOutFormAction } from "@/lib/server/auth-actions";

function getInitials(name: string | null, email: string): string {
  const source = (name?.trim() || email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || source[0]!.toUpperCase();
}

export interface AdminHeaderProps {
  title: string;
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export function AdminHeader({ title, user }: AdminHeaderProps) {
  const displayName = user.name?.trim() || user.email;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-white px-4 sm:px-6">
      <h1 className="truncate text-lg font-semibold text-ink-900">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
            aria-label="Mở menu tài khoản"
          >
            <Avatar
              size="sm"
              src={user.avatarUrl}
              alt={displayName}
              fallback={getInitials(user.name, user.email)}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <form action={signOutFormAction}>
            <DropdownMenuItem asChild>
              <button
                type="submit"
                className="flex w-full items-center gap-2 text-ink-700"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Đăng xuất
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
