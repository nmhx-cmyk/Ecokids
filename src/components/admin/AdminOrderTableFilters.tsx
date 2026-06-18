"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, Option } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "PACKING", label: "Đang đóng gói" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELED", label: "Đã hủy" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả thanh toán" },
  { value: "UNPAID", label: "Chưa thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "total-desc", label: "Tổng tiền giảm" },
];

export function AdminOrderTableFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialStatus = searchParams.get("status") ?? "";
  const initialPayment = searchParams.get("paymentStatus") ?? "";
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
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `/admin/orders?${query}` : "/admin/orders");
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Tìm theo mã đơn, email, SĐT..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-9"
          aria-label="Tìm đơn hàng"
        />
      </div>

      <Select
        value={initialStatus}
        onChange={(e) => updateParams({ status: e.target.value || null })}
        className="lg:w-44"
        aria-label="Lọc theo trạng thái"
      >
        {STATUS_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>

      <Select
        value={initialPayment}
        onChange={(e) =>
          updateParams({ paymentStatus: e.target.value || null })
        }
        className="lg:w-44"
        aria-label="Lọc theo thanh toán"
      >
        {PAYMENT_OPTIONS.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>

      <Select
        value={initialSort}
        onChange={(e) => updateParams({ sort: e.target.value })}
        className="lg:w-44"
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
