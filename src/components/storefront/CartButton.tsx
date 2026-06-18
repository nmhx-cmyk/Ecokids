"use client";

import Link from "next/link";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants/shipping";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore } from "@/stores/cart-store";
import { MiniCartItem } from "./MiniCartItem";

interface CartButtonProps {
  className?: string;
}

export function CartButton({ className }: CartButtonProps) {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const isMiniOpen = useCartStore((s) => s.isMiniOpen);
  const setMiniOpen = useCartStore((s) => s.setMiniOpen);

  const totalItems = hydrated
    ? items.reduce((sum, it) => sum + it.quantity, 0)
    : 0;
  const subtotal = hydrated
    ? items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
    : 0;

  const hasItems = hydrated && items.length > 0;
  const remainingForFreeShip =
    subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD
      ? FREE_SHIPPING_THRESHOLD - subtotal
      : 0;

  return (
    <DropdownMenu open={isMiniOpen} onOpenChange={setMiniOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            hydrated && totalItems > 0
              ? `Giỏ hàng (${totalItems} sản phẩm)`
              : "Giỏ hàng"
          }
          className={cn(
            "relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
            className,
          )}
        >
          <ShoppingCart
            className="h-5 w-5"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {hydrated && totalItems > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-coral-600 px-1 text-xs font-semibold text-white"
            >
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="max-h-[80vh] w-[calc(100vw-1.5rem)] max-w-[420px] overflow-hidden p-0 sm:w-96"
      >
        {!hasItems ? (
          <div className="p-4">
            <EmptyState
              icon={
                <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
              }
              title="Giỏ hàng trống"
              description="Bạn chưa có sản phẩm nào. Cùng khám phá Ecokids nhé!"
              action={
                <Button asChild onClick={() => setMiniOpen(false)}>
                  <Link href="/products">Tiếp tục mua sắm</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-ink-200 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">
                Giỏ hàng ({totalItems})
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              {items.map((item) => (
                <MiniCartItem key={item.variantId} item={item} />
              ))}
            </div>

            <div className="border-t border-ink-200 bg-cream-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-ink-700">Tạm tính</span>
                <span className="font-semibold text-ink-900">
                  {formatVnd(subtotal)}
                </span>
              </div>
              {remainingForFreeShip > 0 ? (
                <p className="mb-3 text-xs text-ink-500">
                  Mua thêm {formatVnd(remainingForFreeShip)} để được miễn phí
                  vận chuyển
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  size="md"
                  className="w-full sm:flex-1"
                  onClick={() => setMiniOpen(false)}
                >
                  <Link href="/cart">Xem giỏ hàng</Link>
                </Button>
                <Button
                  asChild
                  size="md"
                  className="w-full sm:flex-1"
                  onClick={() => setMiniOpen(false)}
                >
                  <Link href="/checkout">Thanh toán</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
