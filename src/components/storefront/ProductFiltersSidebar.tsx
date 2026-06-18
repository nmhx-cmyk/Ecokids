"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { AgeRange, Gender } from "@prisma/client";

import {
  Button,
  Checkbox,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import type { FilterFacets } from "@/lib/queries/product-list";

interface ProductFiltersSidebarProps {
  facets: FilterFacets;
  className?: string;
}

function readActiveAgeRanges(searchParams: URLSearchParams): AgeRange[] {
  const raw = searchParams.get("ageRange");
  if (!raw) return [];
  return raw.split(",").filter(Boolean) as AgeRange[];
}

export function ProductFiltersSidebar({
  facets,
  className,
}: ProductFiltersSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL is source of truth; we only keep transient state for the price inputs
  // since they need an Apply button to commit.
  const activeCategory = searchParams.get("category") ?? "";
  const activeGender = (searchParams.get("gender") ?? "ALL") as
    | Gender
    | "ALL";
  const activeAgeRanges = readActiveAgeRanges(
    new URLSearchParams(searchParams.toString()),
  );
  const activeOnSale = searchParams.get("onSale") === "1";

  const initialMin = searchParams.get("minPrice") ?? "";
  const initialMax = searchParams.get("maxPrice") ?? "";
  const [minPrice, setMinPrice] = React.useState(initialMin);
  const [maxPrice, setMaxPrice] = React.useState(initialMax);

  React.useEffect(() => {
    setMinPrice(searchParams.get("minPrice") ?? "");
    setMaxPrice(searchParams.get("maxPrice") ?? "");
  }, [searchParams]);

  const hasAnyFilter =
    Boolean(activeCategory) ||
    activeGender !== "ALL" ||
    activeAgeRanges.length > 0 ||
    activeOnSale ||
    Boolean(searchParams.get("minPrice")) ||
    Boolean(searchParams.get("maxPrice")) ||
    Boolean(searchParams.get("q"));

  const updateParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const toggleCategory = (slug: string) => {
    updateParams({ category: activeCategory === slug ? null : slug });
  };

  const toggleAgeRange = (value: AgeRange) => {
    const next = activeAgeRanges.includes(value)
      ? activeAgeRanges.filter((v) => v !== value)
      : [...activeAgeRanges, value];
    updateParams({ ageRange: next.length > 0 ? next.join(",") : null });
  };

  const setGender = (value: Gender | "ALL") => {
    updateParams({ gender: value === "ALL" ? null : value });
  };

  const applyPrice = () => {
    updateParams({
      minPrice: minPrice.trim() || null,
      maxPrice: maxPrice.trim() || null,
    });
  };

  const toggleOnSale = (checked: boolean) => {
    updateParams({ onSale: checked ? "1" : null });
  };

  const clearAll = () => {
    // Keep only `q` if present? Spec says "Xoá bộ lọc" — clear everything except q.
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      {hasAnyFilter ? (
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-900">Bộ lọc</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-xs text-coral-600"
          >
            Xoá bộ lọc
          </Button>
        </div>
      ) : null}

      <FilterSection title="Danh mục">
        <ul className="flex flex-col gap-2">
          {facets.categoryTree.map((cat) => (
            <li key={cat.id} className="flex flex-col gap-2">
              <CategoryRow
                slug={cat.slug}
                name={cat.name}
                count={cat.productCount}
                checked={activeCategory === cat.slug}
                onToggle={() => toggleCategory(cat.slug)}
              />
              {cat.children.length > 0 ? (
                <ul className="ml-5 flex flex-col gap-2">
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <CategoryRow
                        slug={child.slug}
                        name={child.name}
                        count={child.productCount}
                        checked={activeCategory === child.slug}
                        onToggle={() => toggleCategory(child.slug)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection title="Độ tuổi">
        <ul className="flex flex-col gap-2">
          {facets.ageRanges.map((opt) => {
            const id = `age-${opt.value}`;
            const checked = activeAgeRanges.includes(opt.value);
            return (
              <li key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={() => toggleAgeRange(opt.value)}
                />
                <Label htmlFor={id} className="cursor-pointer text-sm">
                  {opt.label}
                </Label>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      <FilterSection title="Giới tính">
        <RadioGroup
          value={activeGender}
          onValueChange={(v) => setGender(v as Gender | "ALL")}
          className="gap-2"
        >
          <GenderRow value="ALL" label="Tất cả" />
          {facets.genders.map((g) => (
            <GenderRow key={g.value} value={g.value} label={g.label} />
          ))}
        </RadioGroup>
      </FilterSection>

      <FilterSection title="Giá (VND)">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Từ"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Giá tối thiểu"
            />
            <span className="text-ink-500" aria-hidden="true">
              –
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Đến"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Giá tối đa"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applyPrice}
          >
            Áp dụng giá
          </Button>
        </div>
      </FilterSection>

      <FilterSection title="Khuyến mãi">
        <div className="flex items-center gap-2">
          <Checkbox
            id="onSale"
            checked={activeOnSale}
            onCheckedChange={(v) => toggleOnSale(v === true)}
          />
          <Label htmlFor="onSale" className="cursor-pointer text-sm">
            Chỉ hiển thị sản phẩm đang giảm giá
          </Label>
        </div>
      </FilterSection>
    </aside>
  );
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="border-b border-ink-200 pb-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-ink-900"
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-ink-500 transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function CategoryRow({
  slug,
  name,
  count,
  checked,
  onToggle,
}: {
  slug: string;
  name: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `cat-${slug}`;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle()} />
        <Label htmlFor={id} className="cursor-pointer text-sm">
          {name}
        </Label>
      </div>
      <span className="text-xs text-ink-500">{count}</span>
    </div>
  );
}

function GenderRow({
  value,
  label,
}: {
  value: Gender | "ALL";
  label: string;
}) {
  const id = `gender-${value}`;
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        {label}
      </Label>
    </div>
  );
}
