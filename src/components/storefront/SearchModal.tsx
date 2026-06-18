"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Search, X } from "lucide-react";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
}

interface SearchResponse {
  results: SearchResult[];
  totalEstimate: number;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 6;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [totalEstimate, setTotalEstimate] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;

  // Reset when closing
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setTotalEstimate(0);
      setActiveIndex(-1);
    }
  }, [open]);

  // Fetch results (debounced)
  React.useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: debouncedQuery,
      limit: String(RESULT_LIMIT),
    });

    setIsLoading(true);
    setActiveIndex(-1);

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Search request failed");
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setTotalEstimate(data.totalEstimate);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
        setTotalEstimate(0);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const handleSelect = React.useCallback(
    (slug: string) => {
      onOpenChange(false);
      router.push(`/products/${slug}`);
    },
    [onOpenChange, router],
  );

  const handleViewAll = React.useCallback(() => {
    if (!hasQuery) return;
    onOpenChange(false);
    router.push(`/products?q=${encodeURIComponent(debouncedQuery)}`);
  }, [debouncedQuery, hasQuery, onOpenChange, router]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) {
      if (event.key === "Enter" && hasQuery) {
        event.preventDefault();
        handleViewAll();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? results.length - 1 : prev - 1,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        const active = results[activeIndex];
        if (active) handleSelect(active.slug);
      } else if (hasQuery) {
        handleViewAll();
      }
    }
  };

  const showEmptyState = hasQuery && !isLoading && results.length === 0;
  const showResults = results.length > 0 && !isLoading;
  const headingText = hasQuery ? "Kết quả tìm kiếm" : "Gợi ý sản phẩm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-ink-900/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          className={cn(
            "fixed left-1/2 top-0 z-50 -translate-x-1/2",
            "mt-[10vh] sm:mt-[15vh]",
            "w-[calc(100vw-2rem)] max-w-2xl",
            "overflow-hidden rounded-2xl bg-white shadow-xl",
            "focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Tìm kiếm sản phẩm
          </DialogPrimitive.Title>

          {/* Header: search input */}
          <div className="flex items-center gap-2 border-b border-ink-200/60 px-4 py-3">
            <Search
              className="h-5 w-5 flex-shrink-0 text-ink-500"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm sản phẩm... (VD: áo bé gái, body suit)"
              aria-label="Từ khoá tìm kiếm"
              className="h-10 flex-1 border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-1"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto px-2 py-3">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              {headingText}
            </p>

            {isLoading ? (
              <ul className="flex flex-col gap-1">
                {Array.from({ length: RESULT_LIMIT }).map((_, idx) => (
                  <li key={idx} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <Skeleton className="h-12 w-12 flex-shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {showEmptyState ? (
              <EmptyState
                icon={<Search className="h-5 w-5" strokeWidth={1.5} />}
                title={`Không có kết quả cho "${debouncedQuery}"`}
                description="Thử từ khoá khác?"
              />
            ) : null}

            {showResults ? (
              <ul className="flex flex-col gap-0.5" role="listbox">
                {results.map((result, idx) => (
                  <li key={result.id}>
                    <Link
                      href={`/products/${result.slug}`}
                      onClick={() => onOpenChange(false)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500",
                        activeIndex === idx
                          ? "bg-cream-100"
                          : "hover:bg-cream-100",
                      )}
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-cream-100">
                        {result.primaryImageUrl ? (
                          <Image
                            src={result.primaryImageUrl}
                            alt={result.primaryImageAlt ?? result.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate text-sm font-medium text-ink-900">
                          {result.name}
                        </span>
                        <span className="flex items-baseline gap-2 text-xs">
                          <span className="font-semibold text-coral-600">
                            {formatVnd(result.basePrice)}
                          </span>
                          {result.comparePrice &&
                          result.comparePrice > result.basePrice ? (
                            <span className="text-ink-500 line-through">
                              {formatVnd(result.comparePrice)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Footer */}
          {showResults && hasQuery ? (
            <div className="border-t border-ink-200/60 bg-cream-50/50">
              <button
                type="button"
                onClick={handleViewAll}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-coral-500"
              >
                <span>
                  Xem tất cả kết quả cho{" "}
                  <span className="text-coral-600">&ldquo;{debouncedQuery}&rdquo;</span>
                  {totalEstimate > RESULT_LIMIT ? (
                    <span className="ml-1 text-ink-500">
                      ({totalEstimate})
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : null}

          {/* Loading indicator overlay (subtle, when refetching with prior results) */}
          {isLoading && results.length > 0 ? (
            <div className="pointer-events-none absolute right-4 top-4">
              <Loader2
                className="h-4 w-4 animate-spin text-ink-500"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
