"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, Package, User as UserIcon, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import { signOutAction } from "@/lib/server/auth-actions";

interface MobileDrawerProps {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Bé trai", href: "/products?gender=BOY" },
  { label: "Bé gái", href: "/products?gender=GIRL" },
  { label: "Sơ sinh", href: "/products?ageRange=NEWBORN_0_1" },
  { label: "Mới về", href: "/products?sort=new" },
  { label: "Sale", href: "/products?onSale=true" },
];

export function MobileDrawer({ user }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await signOutAction();
    router.push("/");
    router.refresh();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label="Mở menu điều hướng"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col bg-cream-50 shadow-lg focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-left",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
            "duration-200",
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-200/60 px-4 py-3">
            <DialogPrimitive.Title asChild>
              <Logo variant="small" />
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Đóng menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <nav
            aria-label="Điều hướng chính"
            className="flex-1 overflow-y-auto px-2 py-4"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="flex items-center rounded-lg px-3 py-3 text-base font-medium text-ink-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-ink-200/60 px-2 py-3">
            {user ? (
              <ul className="flex flex-col">
                <li className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {user.name?.trim() || user.email}
                </li>
                <li>
                  <Link
                    href="/account"
                    onClick={close}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-700 transition-colors hover:bg-cream-100"
                  >
                    <UserIcon
                      className="h-4 w-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Tài khoản
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account/orders"
                    onClick={close}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-ink-700 transition-colors hover:bg-cream-100"
                  >
                    <Package
                      className="h-4 w-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Đơn hàng của tôi
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-danger transition-colors hover:bg-cream-100"
                  >
                    <LogOut
                      className="h-4 w-4"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Đăng xuất
                  </button>
                </li>
              </ul>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="flex items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-coral-600"
              >
                <LogIn className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                Đăng nhập
              </Link>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
