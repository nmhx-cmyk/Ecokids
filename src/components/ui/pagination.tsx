"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
  pageParam?: string;
  className?: string;
}

function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 4) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 3) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

function PageItem({
  page,
  active,
  baseUrl,
  pageParam,
  onPageChange,
  children,
  ariaLabel,
  disabled,
}: {
  page: number;
  active?: boolean;
  baseUrl?: string;
  pageParam: string;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const classes = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
    active
      ? "bg-coral-500 text-ink-900"
      : "text-ink-700 hover:bg-cream-100",
    disabled && "pointer-events-none opacity-50",
  );

  if (baseUrl) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const href = `${baseUrl}${separator}${pageParam}=${page}`;
    return (
      <Link
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-current={active ? "page" : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={() => onPageChange?.(page)}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  baseUrl,
  pageParam = "page",
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Phân trang"
      className={cn("flex items-center gap-1", className)}
    >
      <PageItem
        page={Math.max(1, currentPage - 1)}
        baseUrl={baseUrl}
        pageParam={pageParam}
        onPageChange={onPageChange}
        ariaLabel="Trang trước"
        disabled={prevDisabled}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </PageItem>

      {pages.map((p, idx) =>
        p === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm text-ink-500"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <PageItem
            key={p}
            page={p}
            active={p === currentPage}
            baseUrl={baseUrl}
            pageParam={pageParam}
            onPageChange={onPageChange}
            ariaLabel={`Trang ${p}`}
          >
            {p}
          </PageItem>
        ),
      )}

      <PageItem
        page={Math.min(totalPages, currentPage + 1)}
        baseUrl={baseUrl}
        pageParam={pageParam}
        onPageChange={onPageChange}
        ariaLabel="Trang sau"
        disabled={nextDisabled}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </PageItem>
    </nav>
  );
}
