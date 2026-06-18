import Image from "next/image";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { ProductStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProductTableFilters } from "@/components/admin/ProductTableFilters";
import { ProductTableRowActions } from "@/components/admin/ProductTableRowActions";
import {
  getAdminProducts,
  type ProductSort,
} from "@/lib/queries/products";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Sản phẩm — Quản trị",
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang bán",
  ARCHIVED: "Lưu trữ",
};

const STATUS_VARIANT: Record<
  ProductStatus,
  "default" | "mint" | "warning"
> = {
  DRAFT: "default",
  ACTIVE: "mint",
  ARCHIVED: "warning",
};

function toSort(value: string | undefined): ProductSort {
  if (value === "price-asc" || value === "price-desc") return value;
  return "newest";
}

function toStatus(value: string | undefined): ProductStatus | undefined {
  if (value === "DRAFT" || value === "ACTIVE" || value === "ARCHIVED") {
    return value;
  }
  return undefined;
}

function buildBaseUrl(searchParams: {
  q?: string;
  status?: string;
  sort?: string;
}): string {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  const query = params.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  };
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const pageNum = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const result = await getAdminProducts({
    search: searchParams.q,
    status: toStatus(searchParams.status),
    sort: toSort(searchParams.sort),
    page: pageNum,
    pageSize: 20,
  });

  const baseUrl = buildBaseUrl(searchParams);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Sản phẩm</h2>
          <p className="mt-1 text-sm text-ink-500">
            Quản lý danh mục sản phẩm, biến thể và tồn kho.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm sản phẩm
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <ProductTableFilters />

          {result.items.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" aria-hidden="true" />}
              title="Chưa có sản phẩm nào"
              description="Bắt đầu bằng cách thêm sản phẩm đầu tiên cho cửa hàng."
              action={
                <Button asChild>
                  <Link href="/admin/products/new">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Thêm sản phẩm
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                    <th className="w-16 px-3 py-3">Ảnh</th>
                    <th className="px-3 py-3">Tên</th>
                    <th className="px-3 py-3">Danh mục</th>
                    <th className="px-3 py-3">Giá</th>
                    <th className="px-3 py-3">Tồn kho</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Cập nhật</th>
                    <th className="w-12 px-3 py-3" aria-label="Hành động" />
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-ink-200/60 last:border-b-0"
                    >
                      <td className="px-3 py-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-cream-100">
                          {item.primaryImage ? (
                            <Image
                              src={item.primaryImage.url}
                              alt={item.primaryImage.alt || item.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-500">
                              <Package className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/products/${item.id}/edit`}
                          className="font-medium text-ink-900 hover:text-coral-600"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-ink-500">/{item.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {item.category?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {formatVnd(item.basePrice)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink-900">
                            {item.totalStock}
                          </span>
                          {item.variantCount > 0 && item.minStock < 5 ? (
                            <Badge variant="danger">Sắp hết</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-ink-500">
                          {item.variantCount} biến thể
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={STATUS_VARIANT[item.status]}>
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ProductTableRowActions
                          productId={item.id}
                          productSlug={item.slug}
                          productName={item.name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.totalPages > 1 ? (
            <div className="flex justify-end">
              <Pagination
                currentPage={result.page}
                totalPages={result.totalPages}
                baseUrl={baseUrl}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
