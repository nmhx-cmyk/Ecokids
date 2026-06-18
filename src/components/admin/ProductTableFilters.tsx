"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, Option } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Nháp" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
];

export function ProductTableFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialSort = searchParams.get("sort") ?? "newest";

  const [searchValue, setSearchValue] = React.useState(initialQ);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 whenever filter changes.
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `/admin/products?${query}` : "/admin/products");
    },
    [router, searchParams],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value.trim() || null });
    }, 300);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Tìm theo tên hoặc slug..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-9"
          aria-label="Tìm sản phẩm"
        />
      </div>

      <Select
        value={initialStatus}
        onChange={(e) => updateParams({ status: e.target.value || null })}
        className="sm:w-44"
        aria-label="Lọc theo trạng thái"
      >
        {STATUS_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>

      <Select
        value={initialSort}
        onChange={(e) => updateParams({ sort: e.target.value })}
        className="sm:w-44"
        aria-label="Sắp xếp"
      >
        {SORT_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>
    </div>
  );
}
