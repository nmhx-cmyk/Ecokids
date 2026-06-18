"use client";

import Link from "next/link";
import { Scale, X } from "lucide-react";

import { useCompareStore } from "@/stores/compare-store";
import { useHydrated } from "@/hooks/use-hydrated";

export function CompareBar() {
  const hydrated = useHydrated();
  const ids = useCompareStore((s) => s.ids);
  const clear = useCompareStore((s) => s.clear);

  if (!hydrated || ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2 text-sm text-ink-700">
          <Scale className="h-4 w-4 text-coral-600" aria-hidden="true" />
          <span>
            Đang so sánh <span className="font-semibold">{ids.length}</span> sản phẩm
          </span>
          <button
            type="button"
            onClick={clear}
            className="ml-1 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-danger"
          >
            <X className="h-3 w-3" aria-hidden="true" /> Xoá hết
          </button>
        </div>
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600"
        >
          So sánh ngay
        </Link>
      </div>
    </div>
  );
}
