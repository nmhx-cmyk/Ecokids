"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

/** Read-only star display, supports half-star rounding visually. */
export function StarRating({ value, size = "md", className }: StarRatingProps) {
  const cls = SIZE_MAP[size];
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            cls,
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "fill-ink-100 text-ink-200",
          )}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Interactive star picker for the review form. */
export function StarRatingInput({
  value,
  onChange,
  disabled,
}: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} sao`}
          disabled={disabled}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
          className="rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 disabled:cursor-not-allowed"
        >
          <Star
            className={cn(
              "h-7 w-7",
              i <= active
                ? "fill-amber-400 text-amber-400"
                : "fill-ink-100 text-ink-200",
            )}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
