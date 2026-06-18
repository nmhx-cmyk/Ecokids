"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, X } from "lucide-react";
import { Badge, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";
import { useCartStore, type CartItem } from "@/stores/cart-store";

interface CartItemRowProps {
  item: CartItem;
  stockIssue?: { availableStock: number };
}

export function CartItemRow({ item, stockIssue }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const canDecrease = item.quantity > 1;
  const canIncrease = item.quantity < item.maxStock;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") return;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return;
    updateQuantity(item.variantId, n);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/products/${item.productSlug}`}
          className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-100 sm:h-[120px] sm:w-24"
        >
          {item.productImage ? (
            <Image
              src={item.productImage}
              alt={item.productName}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="text-sm font-semibold text-ink-900 transition-colors hover:text-coral-600 sm:text-base"
              >
                {item.productName}
              </Link>
              <p className="text-xs text-ink-500">
                Kích cỡ: {item.size}
                {item.sizeNote ? ` (${item.sizeNote})` : ""} · Màu: {item.color}
              </p>
              <p className="text-xs text-ink-500">
                Còn {item.maxStock} sản phẩm
              </p>
              {stockIssue ? (
                <div className="mt-1 inline-flex items-center gap-1">
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle
                      className="h-3 w-3"
                      aria-hidden="true"
                    />
                    Chỉ còn {stockIssue.availableStock} sản phẩm
                  </Badge>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              aria-label={`Xoá ${item.productName} khỏi giỏ`}
              onClick={() => removeItem(item.variantId)}
              className="rounded-md p-1 text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm số lượng"
                onClick={() =>
                  updateQuantity(item.variantId, item.quantity - 1)
                }
                disabled={!canDecrease}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-900 transition-colors hover:bg-cream-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={item.maxStock}
                value={item.quantity}
                onChange={handleInputChange}
                aria-label="Số lượng"
                className="h-9 w-16 text-center"
              />
              <button
                type="button"
                aria-label="Tăng số lượng"
                onClick={() =>
                  updateQuantity(item.variantId, item.quantity + 1)
                }
                disabled={!canIncrease}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-900 transition-colors hover:bg-cream-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-xs text-ink-500">
                {formatVnd(item.unitPrice)} / sp
              </span>
              <span className="text-base font-semibold text-coral-600">
                {formatVnd(item.unitPrice * item.quantity)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
