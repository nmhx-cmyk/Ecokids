"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { useWishlistStore } from "@/stores/wishlist-store";
import { toggleWishlist } from "@/lib/server/wishlist";
import { cn } from "@/lib/utils/cn";

interface WishlistButtonProps {
  productId: string;
  /** "overlay" = small circular button for cards; "inline" = labelled button for detail page. */
  variant?: "overlay" | "inline";
  className?: string;
}

export function WishlistButton({
  productId,
  variant = "overlay",
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const load = useWishlistStore((s) => s.load);
  const setActive = useWishlistStore((s) => s.setActive);
  const active = useWishlistStore((s) => s.ids.has(productId));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const onClick = async (e: React.MouseEvent) => {
    // The button can overlay a card-wide <Link>; never trigger navigation.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const optimistic = !active;
    setActive(productId, optimistic);
    setPending(true);
    const result = await toggleWishlist(productId);
    setPending(false);

    if (!result.ok) {
      setActive(productId, !optimistic); // revert
      if (result.error.code === "UNAUTHORIZED") {
        toast.error("Vui lòng đăng nhập để lưu sản phẩm yêu thích");
        router.push("/login?redirectTo=/account/wishlist");
      } else {
        toast.error(result.error.message);
      }
      return;
    }

    setActive(productId, result.data.active);
    toast.success(result.data.active ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích");
  };

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
          active
            ? "border-coral-500 bg-coral-50 text-coral-600"
            : "border-ink-200 text-ink-700 hover:bg-cream-100",
          className,
        )}
      >
        <Heart
          className={cn("h-4 w-4", active && "fill-coral-500 text-coral-500")}
          strokeWidth={1.5}
        />
        {active ? "Đã yêu thích" : "Yêu thích"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-500 shadow-sm transition-colors hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
        className,
      )}
    >
      <Heart
        className={cn("h-4 w-4", active && "fill-coral-500 text-coral-500")}
        strokeWidth={1.5}
      />
    </button>
  );
}
