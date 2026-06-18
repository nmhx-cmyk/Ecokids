"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { CartItemRow } from "@/components/storefront/CartItemRow";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatVnd } from "@/lib/utils/format";
import { validateCartStock } from "@/lib/server/cart";
import { useCartStore } from "@/stores/cart-store";

export default function CartPage() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);

  const subtotal = React.useMemo(
    () => items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [items],
  );
  const totalItems = React.useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items],
  );

  const [stockIssues, setStockIssues] = React.useState<
    Map<string, { availableStock: number }>
  >(new Map());

  // Re-validate stock when items change after hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      setStockIssues(new Map());
      return;
    }
    let cancelled = false;
    const payload = items.map((it) => ({
      variantId: it.variantId,
      quantity: it.quantity,
    }));
    void validateCartStock(payload).then((result) => {
      if (cancelled) return;
      if (!result.ok) return;
      const next = new Map<string, { availableStock: number }>();
      for (const issue of result.data.issues) {
        next.set(issue.variantId, { availableStock: issue.availableStock });
      }
      setStockIssues(next);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  if (!hydrated) {
    return (
      <div className="container max-w-6xl py-8">
        <h1 className="mb-6 text-2xl font-semibold text-ink-900 lg:text-3xl">
          Giỏ hàng của bạn
        </h1>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <h1 className="mb-6 text-2xl font-semibold text-ink-900 lg:text-3xl">
        Giỏ hàng của bạn
        {totalItems > 0 ? (
          <span className="ml-2 text-base font-normal text-ink-500">
            ({totalItems} sản phẩm)
          </span>
        ) : null}
      </h1>

      {items.length === 0 ? (
        <Card className="py-4">
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" strokeWidth={1.5} />}
            title="Giỏ hàng trống"
            description="Bạn chưa thêm sản phẩm nào vào giỏ hàng."
            action={
              <Button asChild>
                <Link href="/products">Khám phá sản phẩm</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <CartItemRow
                key={item.variantId}
                item={item}
                stockIssue={stockIssues.get(item.variantId)}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-ink-900">
                Tóm tắt đơn hàng
              </h2>

              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-700">Tạm tính</dt>
                  <dd className="font-medium text-ink-900">
                    {formatVnd(subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-700">Phí vận chuyển</dt>
                  <dd className="text-xs text-ink-500">
                    Tính ở bước thanh toán
                  </dd>
                </div>
                <div className="border-t border-ink-200 pt-3" />
                <div className="flex items-center justify-between">
                  <dt className="font-semibold text-ink-900">
                    Tổng cộng (tạm thời)
                  </dt>
                  <dd className="text-lg font-bold text-coral-600">
                    {formatVnd(subtotal)}
                  </dd>
                </div>
              </dl>

              <Button
                asChild
                size="lg"
                className="mt-6 w-full"
                disabled={items.length === 0}
              >
                <Link href="/checkout">
                  Tiến hành thanh toán
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <p className="mt-3 text-xs text-ink-500">
                Phí vận chuyển và mã giảm giá sẽ được tính ở bước tiếp theo.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
