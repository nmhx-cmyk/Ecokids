"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { adjustVariantStock } from "@/lib/server/inventory";
import { cn } from "@/lib/utils/cn";

export interface InventoryEditableCellProps {
  variantId: string;
  initialStock: number;
  productName: string;
  sku: string;
}

export function InventoryEditableCell({
  variantId,
  initialStock,
  productName,
  sku,
}: InventoryEditableCellProps) {
  const router = useRouter();
  const inputId = useId();
  const [stock, setStock] = useState(initialStock);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialStock));
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  function startEdit() {
    cancelledRef.current = false;
    setDraft(String(stock));
    setEditing(true);
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  function cancelEdit() {
    cancelledRef.current = true;
    setEditing(false);
    setDraft(String(stock));
  }

  function commit() {
    if (cancelledRef.current) return;
    const next = Number(draft);
    if (!Number.isFinite(next) || !Number.isInteger(next) || next < 0) {
      toast.error("Tồn kho phải là số nguyên không âm");
      setDraft(String(stock));
      setEditing(false);
      return;
    }
    if (next === stock) {
      setEditing(false);
      return;
    }

    const previous = stock;
    setStock(next); // optimistic
    setEditing(false);

    startTransition(async () => {
      const result = await adjustVariantStock(variantId, next);
      if (!result.ok) {
        setStock(previous);
        toast.error(result.error.message);
        return;
      }
      const delta = result.data.delta;
      const verb = delta > 0 ? "Đã nhập" : delta < 0 ? "Đã xuất" : "Đã ghi nhận";
      toast.success(
        `${verb} ${Math.abs(delta)} cho ${productName} (${sku})`,
      );
      router.refresh();
    });
  }

  const label = `Cập nhật tồn kho cho ${productName} ${sku}`;

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Input
          id={inputId}
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          className="h-8 w-20 px-2 text-right text-sm"
          aria-label={label}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          aria-label="Lưu"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancelEdit}
          aria-label="Huỷ"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={isPending}
      aria-label={label}
      className={cn(
        "group inline-flex min-w-[56px] items-center justify-end gap-1 rounded-md px-2 py-1 text-right text-sm font-medium text-ink-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
        isPending && "opacity-60",
      )}
    >
      <span className="tabular-nums">{stock}</span>
      {isPending ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <Pencil
          className="h-3.5 w-3.5 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
