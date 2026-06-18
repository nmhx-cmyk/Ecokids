"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";
import { useCartStore, type CartItem } from "@/stores/cart-store";

interface MiniCartItemProps {
  item: CartItem;
}

export function MiniCartItem({ item }: MiniCartItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const canDecrease = item.quantity > 1;
  const canIncrease = item.quantity < item.maxStock;

  return (
    <div className="flex gap-3 border-b border-ink-200 py-3 last:border-0">
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-cream-100">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-sm font-medium text-ink-900">
          {item.productName}
        </p>
        <p className="text-xs text-ink-500">
          {item.size}
          {item.sizeNote ? ` (${item.sizeNote})` : ""} · {item.color}
        </p>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-md border border-ink-200">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
              disabled={!canDecrease}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center text-ink-700 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Minus className="h-3 w-3" aria-hidden="true" />
            </button>
            <span
              className="min-w-[2rem] text-center text-sm font-medium text-ink-900"
              aria-label={`Số lượng ${item.quantity}`}
            >
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
              disabled={!canIncrease}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center text-ink-700 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm font-medium text-ink-900">
            {formatVnd(item.unitPrice * item.quantity)}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label={`Xoá ${item.productName} khỏi giỏ`}
        onClick={() => removeItem(item.variantId)}
        className="self-start rounded-md p-1 text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
