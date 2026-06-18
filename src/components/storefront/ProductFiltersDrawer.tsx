"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Filter, X } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button, Dialog, DialogOverlay, DialogPortal } from "@/components/ui";
import { ProductFiltersSidebar } from "@/components/storefront/ProductFiltersSidebar";
import type { FilterFacets } from "@/lib/queries/product-list";

interface ProductFiltersDrawerProps {
  facets: FilterFacets;
}

function countActiveFilters(searchParams: URLSearchParams): number {
  let count = 0;
  if (searchParams.get("category")) count += 1;
  if (searchParams.get("gender")) count += 1;
  if (searchParams.get("ageRange")) count += 1;
  if (searchParams.get("minPrice") || searchParams.get("maxPrice")) count += 1;
  if (searchParams.get("onSale") === "1") count += 1;
  return count;
}

export function ProductFiltersDrawer({ facets }: ProductFiltersDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const activeCount = countActiveFilters(
    new URLSearchParams(searchParams.toString()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button type="button" variant="outline" size="md" className="lg:hidden">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Lọc{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          aria-describedby={undefined}
        >
          <header className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <DialogPrimitive.Title className="text-base font-semibold text-ink-900">
              Bộ lọc
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-ink-500 transition-colors hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ProductFiltersSidebar facets={facets} />
          </div>
          <footer className="border-t border-ink-200 px-4 py-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Áp dụng
            </Button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
