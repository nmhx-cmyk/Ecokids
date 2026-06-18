"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SearchModal } from "./SearchModal";

interface SearchTriggerProps {
  className?: string;
}

export function SearchTrigger({ className }: SearchTriggerProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở tìm kiếm"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg text-ink-700 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
          "h-10 w-10 justify-center lg:h-10 lg:w-auto lg:px-3",
          className,
        )}
      >
        <Search className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden text-sm font-medium lg:inline">Tìm kiếm</span>
      </button>
      <SearchModal open={open} onOpenChange={setOpen} />
    </>
  );
}
