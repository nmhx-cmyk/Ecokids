"use client";

import { Scale } from "lucide-react";
import { useCompareStore } from "@/stores/compare-store";
import { cn } from "@/lib/utils/cn";

interface CompareButtonProps {
  productId: string;
  productName: string;
  className?: string;
}

export function CompareButton({
  productId,
  productName,
  className,
}: CompareButtonProps) {
  const active = useCompareStore((s) => s.ids.includes(productId));
  const toggle = useCompareStore((s) => s.toggle);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId, productName);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Bỏ khỏi so sánh" : "Thêm vào so sánh"}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        active
          ? "bg-coral-500 text-white"
          : "bg-white/90 text-ink-500 hover:text-coral-600",
        className,
      )}
    >
      <Scale className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}
