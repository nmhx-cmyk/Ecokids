"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut, Package, User as UserIcon } from "lucide-react";
import {
  Avatar,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { signOutAction } from "@/lib/server/auth-actions";

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

function getInitial(user: { name: string | null; email: string }): string {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!user) {
    return (
      <Button asChild size="sm" variant="primary">
        <Link href="/login">Đăng nhập</Link>
      </Button>
    );
  }

  const displayName = user.name?.trim() || user.email;

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tài khoản của ${displayName}`}
        className="inline-flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
      >
        <Avatar
          size="sm"
          src={user.avatarUrl}
          alt={displayName}
          fallback={getInitial(user)}
        />
        <span className="hidden max-w-[120px] truncate pr-2 text-sm font-medium text-ink-700 lg:inline">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>Xin chào</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Tài khoản
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Đơn hàng của tôi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleSignOut();
          }}
          disabled={isPending}
          className="text-danger focus:text-danger"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
