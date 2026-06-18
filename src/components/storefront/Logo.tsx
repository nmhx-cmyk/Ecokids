import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  variant?: "default" | "small";
  className?: string;
}

export function Logo({ variant = "default", className }: LogoProps) {
  const isSmall = variant === "small";

  return (
    <Link
      href="/"
      aria-label="Ecokids - Trang chủ"
      className={cn(
        "inline-flex items-center gap-2 font-display font-bold text-ink-900 transition-opacity hover:opacity-80",
        isSmall ? "text-lg" : "text-2xl",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-coral-50 text-coral-600",
          isSmall ? "h-7 w-7" : "h-9 w-9",
        )}
      >
        <Leaf
          className={isSmall ? "h-4 w-4" : "h-5 w-5"}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </span>
      <span>Ecokids</span>
    </Link>
  );
}
