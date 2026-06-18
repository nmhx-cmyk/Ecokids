"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export interface InventoryFiltersProps {
  initialQ: string;
  initialLowStockOnly: boolean;
}

export function InventoryFilters({
  initialQ,
  initialLowStockOnly,
}: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();
  const lowStockId = useId();

  const [q, setQ] = useState(initialQ);
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockOnly);
  const [isPending, startTransition] = useTransition();

  // Debounce search input
  useEffect(() => {
    if (q === initialQ) return;
    const timer = setTimeout(() => {
      apply({ q, lowStockOnly });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function apply(next: { q: string; lowStockOnly: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q) {
      params.set("q", next.q);
    } else {
      params.delete("q");
    }
    if (next.lowStockOnly) {
      params.set("lowStockOnly", "1");
    } else {
      params.delete("lowStockOnly");
    }
    params.delete("page");
    if (!params.get("tab")) params.set("tab", "stock");
    startTransition(() => {
      router.replace(`/admin/inventory?${params.toString()}`);
    });
  }

  function handleLowStockChange(checked: boolean) {
    setLowStockOnly(checked);
    apply({ q, lowStockOnly: checked });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <label htmlFor={searchId} className="sr-only">
          Tìm sản phẩm hoặc SKU
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <Input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên sản phẩm hoặc SKU…"
          className="pl-9"
        />
        {isPending ? (
          <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        ) : null}
      </div>

      <label
        htmlFor={lowStockId}
        className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-700"
      >
        <Checkbox
          id={lowStockId}
          checked={lowStockOnly}
          onCheckedChange={(value) => handleLowStockChange(value === true)}
        />
        Chỉ sản phẩm sắp hết
      </label>
    </div>
  );
}
