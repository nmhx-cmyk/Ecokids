"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { AgeRange, Gender } from "@prisma/client";

import { Badge } from "@/components/ui";
import { AGE_RANGE_LABELS } from "@/lib/constants/age-ranges";
import { GENDER_LABELS } from "@/lib/constants/gender";
import { formatVnd } from "@/lib/utils/format";
import type { FilterFacets } from "@/lib/queries/product-list";

interface ActiveFilterChipsProps {
  facets: FilterFacets;
}

type Chip = {
  key: string;
  label: string;
  remove: (params: URLSearchParams) => void;
};

export function ActiveFilterChips({ facets }: ActiveFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: Chip[] = [];

  const q = searchParams.get("q");
  if (q) {
    chips.push({
      key: "q",
      label: `Từ khoá: "${q}"`,
      remove: (p) => p.delete("q"),
    });
  }

  const categorySlug = searchParams.get("category");
  if (categorySlug) {
    const flat = flattenCategories(facets.categoryTree);
    const match = flat.find((c) => c.slug === categorySlug);
    chips.push({
      key: "category",
      label: `Danh mục: ${match?.name ?? categorySlug}`,
      remove: (p) => p.delete("category"),
    });
  }

  const gender = searchParams.get("gender") as Gender | null;
  if (gender && (gender === "BOY" || gender === "GIRL" || gender === "UNISEX")) {
    chips.push({
      key: "gender",
      label: `Giới tính: ${GENDER_LABELS[gender]}`,
      remove: (p) => p.delete("gender"),
    });
  }

  const ageRangeRaw = searchParams.get("ageRange");
  if (ageRangeRaw) {
    const values = ageRangeRaw.split(",").filter(Boolean) as AgeRange[];
    for (const v of values) {
      if (AGE_RANGE_LABELS[v]) {
        chips.push({
          key: `age-${v}`,
          label: `Tuổi: ${AGE_RANGE_LABELS[v]}`,
          remove: (p) => {
            const remaining = values.filter((x) => x !== v);
            if (remaining.length > 0) p.set("ageRange", remaining.join(","));
            else p.delete("ageRange");
          },
        });
      }
    }
  }

  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  if (minPrice || maxPrice) {
    const minN = minPrice ? Number(minPrice) : null;
    const maxN = maxPrice ? Number(maxPrice) : null;
    let label = "Giá: ";
    if (minN !== null && maxN !== null)
      label += `${formatVnd(minN)} – ${formatVnd(maxN)}`;
    else if (minN !== null) label += `Từ ${formatVnd(minN)}`;
    else if (maxN !== null) label += `Đến ${formatVnd(maxN)}`;
    chips.push({
      key: "price",
      label,
      remove: (p) => {
        p.delete("minPrice");
        p.delete("maxPrice");
      },
    });
  }

  if (searchParams.get("onSale") === "1") {
    chips.push({
      key: "onSale",
      label: "Đang giảm giá",
      remove: (p) => p.delete("onSale"),
    });
  }

  if (chips.length === 0) return null;

  const removeChip = (chip: Chip) => {
    const params = new URLSearchParams(searchParams.toString());
    chip.remove(params);
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Badge
            variant="default"
            className="inline-flex items-center gap-1 py-1 pl-2 pr-1"
          >
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="rounded-full p-0.5 text-ink-500 transition-colors hover:bg-ink-200/40 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
              aria-label={`Xoá ${chip.label}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function flattenCategories(
  tree: FilterFacets["categoryTree"],
): { slug: string; name: string }[] {
  const out: { slug: string; name: string }[] = [];
  for (const node of tree) {
    out.push({ slug: node.slug, name: node.name });
    if (node.children.length > 0) {
      out.push(...flattenCategories(node.children));
    }
  }
  return out;
}
