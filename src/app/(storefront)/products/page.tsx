import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import type { AgeRange, Gender } from "@prisma/client";

import { Button, EmptyState, Pagination } from "@/components/ui";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ProductFiltersSidebar } from "@/components/storefront/ProductFiltersSidebar";
import { ProductFiltersDrawer } from "@/components/storefront/ProductFiltersDrawer";
import { ProductSortSelect } from "@/components/storefront/ProductSortSelect";
import { ActiveFilterChips } from "@/components/storefront/ActiveFilterChips";
import { prisma } from "@/lib/prisma";
import {
  searchProducts,
  getFilterFacets,
  type StorefrontSort,
} from "@/lib/queries/product-list";

export const dynamic = "force-dynamic";

const LIST_DESCRIPTION =
  "Khám phá quần áo trẻ em chất lượng, an toàn cho bé từ sơ sinh đến 12 tuổi tại Ecokids.";

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const q = first(searchParams.q)?.trim();
  const categorySlug = first(searchParams.category)?.trim() || undefined;

  if (q) {
    return {
      title: `Tìm "${q}" | Ecokids`,
      description: `Kết quả tìm kiếm cho "${q}" tại Ecokids.`,
      robots: { index: false, follow: true },
    };
  }

  if (categorySlug) {
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { name: true },
    });
    if (category) {
      return {
        title: `${category.name} | Ecokids`,
        description: `Sản phẩm ${category.name} cho bé tại Ecokids. ${LIST_DESCRIPTION}`,
        alternates: { canonical: `/products?category=${categorySlug}` },
      };
    }
  }

  return {
    title: "Tất cả sản phẩm | Ecokids",
    description: LIST_DESCRIPTION,
    alternates: { canonical: "/products" },
  };
}

type SearchParamValue = string | string[] | undefined;

interface ProductsPageProps {
  searchParams: Record<string, SearchParamValue>;
}

const VALID_SORTS: StorefrontSort[] = [
  "new",
  "price_asc",
  "price_desc",
  "name_asc",
];
const VALID_AGE_RANGES: AgeRange[] = [
  "NEWBORN_0_1",
  "TODDLER_1_3",
  "KID_3_6",
  "KID_6_12",
];
const VALID_GENDERS: Gender[] = ["BOY", "GIRL", "UNISEX"];

function first(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseIntParam(value: SearchParamValue): number | undefined {
  const s = first(value);
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseAgeRanges(value: SearchParamValue): AgeRange[] | undefined {
  const s = first(value);
  if (!s) return undefined;
  const items = s
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is AgeRange => VALID_AGE_RANGES.includes(v as AgeRange));
  return items.length > 0 ? items : undefined;
}

function parseGender(value: SearchParamValue): Gender | undefined {
  const s = first(value);
  if (!s) return undefined;
  return VALID_GENDERS.includes(s as Gender) ? (s as Gender) : undefined;
}

function parseSort(value: SearchParamValue): StorefrontSort {
  const s = first(value);
  if (s && VALID_SORTS.includes(s as StorefrontSort)) {
    return s as StorefrontSort;
  }
  return "new";
}

function buildBaseUrl(searchParams: Record<string, SearchParamValue>): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(searchParams)) {
    if (key === "page") continue;
    const v = first(raw);
    if (v) params.set(key, v);
  }
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const q = first(searchParams.q)?.trim();
  const categorySlug = first(searchParams.category)?.trim() || undefined;
  const gender = parseGender(searchParams.gender);
  const ageRanges = parseAgeRanges(searchParams.ageRange);
  const minPrice = parseIntParam(searchParams.minPrice);
  const maxPrice = parseIntParam(searchParams.maxPrice);
  const onSale = first(searchParams.onSale) === "1";
  const sort = parseSort(searchParams.sort);
  const page = Math.max(1, parseIntParam(searchParams.page) ?? 1);

  const [result, facets] = await Promise.all([
    searchProducts({
      q,
      categorySlug,
      gender,
      ageRanges,
      minPrice,
      maxPrice,
      onSale,
      sort,
      page,
      pageSize: 24,
    }),
    getFilterFacets(),
  ]);

  const baseUrl = buildBaseUrl(searchParams);

  return (
    <div className="container py-6 sm:py-8">
      <nav
        aria-label="Đường dẫn"
        className="mb-3 flex items-center gap-1 text-sm text-ink-500"
      >
        <Link href="/" className="hover:text-ink-900">
          Trang chủ
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <span className="text-ink-900">Sản phẩm</span>
      </nav>

      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
          {q ? `Kết quả cho "${q}"` : "Tất cả sản phẩm"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{result.total} sản phẩm</p>
      </header>

      <div className="mb-4">
        <ActiveFilterChips facets={facets} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <ProductFiltersSidebar facets={facets} />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <ProductFiltersDrawer facets={facets} />
            <div className="ml-auto">
              <ProductSortSelect />
            </div>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
              title="Không tìm thấy sản phẩm phù hợp"
              description="Thử điều chỉnh bộ lọc hoặc tìm kiếm với từ khoá khác."
              action={
                <Button asChild variant="secondary">
                  <Link href="/products">Xoá bộ lọc</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ProductGrid products={result.items} />
              {result.totalPages > 1 ? (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    currentPage={result.page}
                    totalPages={result.totalPages}
                    baseUrl={baseUrl}
                    pageParam="page"
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
