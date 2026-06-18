"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

interface FlashCountdownProps {
  /** ISO timestamp when the flash sale ends. */
  endsAt: string;
  className?: string;
  /** Render style: "chip" (compact pills) or "inline" (text). */
  variant?: "chip" | "inline";
}

function diffParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function FlashCountdown({
  endsAt,
  className,
  variant = "chip",
}: FlashCountdownProps) {
  const hydrated = useHydrated();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setRemaining(end - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Avoid SSR/client mismatch — render a stable placeholder until mounted.
  if (!hydrated) return null;
  if (remaining <= 0) {
    return <span className={className}>Đã kết thúc</span>;
  }

  const { days, hours, minutes, seconds } = diffParts(remaining);

  if (variant === "inline") {
    return (
      <span className={className}>
        {days > 0 ? `${days} ngày ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  const cells: { value: number; label: string }[] = [
    ...(days > 0 ? [{ value: days, label: "ngày" }] : []),
    { value: hours, label: "giờ" },
    { value: minutes, label: "phút" },
    { value: seconds, label: "giây" },
  ];

  return (
    <span className={className}>
      <span className="inline-flex items-center gap-1.5">
        {cells.map((c) => (
          <span
            key={c.label}
            className="inline-flex min-w-[2.25rem] flex-col items-center rounded-md bg-ink-900 px-1.5 py-1 text-white"
          >
            <span className="text-sm font-bold leading-none tabular-nums">
              {pad(c.value)}
            </span>
            <span className="text-[9px] uppercase tracking-wide text-white/70">
              {c.label}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
