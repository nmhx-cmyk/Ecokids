import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, History, Package } from "lucide-react";

import { InventoryEditableCell } from "@/components/admin/InventoryEditableCell";
import { InventoryFilters } from "@/components/admin/InventoryFilters";
import { InventoryLogsTable } from "@/components/admin/InventoryLogsTable";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  getInventoryList,
  LOW_STOCK_THRESHOLD,
} from "@/lib/queries/inventory";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Tồn kho",
};

type SearchParams = {
  tab?: string;
  q?: string;
  lowStockOnly?: string;
  page?: string;
};

function parsePage(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <Badge variant="danger">Hết</Badge>;
  }
  if (stock < LOW_STOCK_THRESHOLD) {
    return <Badge variant="warning">Sắp hết</Badge>;
  }
  return <Badge variant="mint">Còn hàng</Badge>;
}

function buildBaseUrl(params: { q: string; lowStockOnly: boolean; tab: string }): string {
  const search = new URLSearchParams();
  search.set("tab", params.tab);
  if (params.q) search.set("q", params.q);
  if (params.lowStockOnly) search.set("lowStockOnly", "1");
  const qs = search.toString();
  return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const tab = searchParams.tab === "logs" ? "logs" : "stock";
  const q = searchParams.q?.trim() ?? "";
  const lowStockOnly = searchParams.lowStockOnly === "1";
  const page = parsePage(searchParams.page);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 py-2">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-ink-900">Tồn kho</h2>
        <p className="text-sm text-ink-500">
          Theo dõi và điều chỉnh tồn kho theo từng biến thể sản phẩm.
        </p>
      </header>

      <nav
        aria-label="Chế độ xem tồn kho"
        className="flex border-b border-ink-200"
      >
        <TabLink
          href={buildBaseUrl({ q, lowStockOnly, tab: "stock" })}
          active={tab === "stock"}
          icon={<Package className="h-4 w-4" aria-hidden="true" />}
          label="Tồn kho"
        />
        <TabLink
          href={buildBaseUrl({ q, lowStockOnly, tab: "logs" })}
          active={tab === "logs"}
          icon={<History className="h-4 w-4" aria-hidden="true" />}
          label="Lịch sử kho"
        />
      </nav>

      {tab === "stock" ? (
        <StockTab q={q} lowStockOnly={lowStockOnly} page={page} />
      ) : (
        <LogsTab />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-coral-500 text-coral-600"
          : "border-transparent text-ink-500 hover:text-ink-900",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

async function StockTab({
  q,
  lowStockOnly,
  page,
}: {
  q: string;
  lowStockOnly: boolean;
  page: number;
}) {
  const result = await getInventoryList({
    search: q || undefined,
    lowStockOnly,
    page,
    pageSize: 20,
  });

  const baseUrl = buildBaseUrl({ q, lowStockOnly, tab: "stock" });

  return (
    <section className="flex flex-col gap-4">
      <InventoryFilters initialQ={q} initialLowStockOnly={lowStockOnly} />

      {result.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            title="Không tìm thấy biến thể nào"
            description="Thử thay đổi từ khoá hoặc bỏ lọc 'Chỉ sản phẩm sắp hết'."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-2">
                    Ảnh
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Sản phẩm
                  </th>
                  <th scope="col" className="px-4 py-2">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Size
                  </th>
                  <th scope="col" className="px-4 py-2">
                    Màu
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Tồn
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200">
                {result.items.map((item) => (
                  <tr key={item.variantId} className="hover:bg-cream-50">
                    <td className="px-4 py-3 align-middle">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-cream-100">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-500">
                            <Package className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        href={`/admin/products/${item.productId}/edit`}
                        className="font-medium text-ink-900 hover:text-coral-600"
                      >
                        {item.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle font-mono text-xs text-ink-700">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 align-middle text-ink-700">
                      {item.size}
                      {item.sizeNote ? (
                        <span className="ml-1 text-xs text-ink-500">
                          ({item.sizeNote})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center gap-2 text-ink-700">
                        {item.colorHex ? (
                          <span
                            className="inline-block h-4 w-4 rounded-full border border-ink-200"
                            style={{ backgroundColor: item.colorHex }}
                            aria-hidden="true"
                          />
                        ) : null}
                        {item.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <StockBadge stock={item.stock} />
                        <InventoryEditableCell
                          variantId={item.variantId}
                          initialStock={item.stock}
                          productName={item.productName}
                          sku={item.sku}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
    </section>
  );
}

async function LogsTab() {
  return (
    <section>
      <InventoryLogsTable />
    </section>
  );
}
