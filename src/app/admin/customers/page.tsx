import Link from "next/link";
import { Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { getCustomers } from "@/lib/queries/customers";
import { formatDate, formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Khách hàng — Quản trị",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    q?: string;
    page?: string;
  };
}

function buildBaseUrl(q: string | undefined): string {
  return q ? `/admin/customers?q=${encodeURIComponent(q)}` : "/admin/customers";
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const pageNum = Math.max(
    1,
    Number.parseInt(searchParams.page ?? "1", 10) || 1,
  );

  const result = await getCustomers({
    search: searchParams.q,
    page: pageNum,
    pageSize: 20,
  });

  const baseUrl = buildBaseUrl(searchParams.q);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-ink-900">Khách hàng</h2>
          <Badge variant="default">{result.total}</Badge>
        </div>
        <p className="text-sm text-ink-500">
          Danh sách khách hàng đã đăng ký và lịch sử mua hàng.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <form method="GET" className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder="Tìm theo tên hoặc email…"
                className="pl-9"
                aria-label="Tìm khách hàng"
              />
            </div>
            <Button type="submit">Tìm</Button>
          </form>

          {result.customers.length === 0 ? (
            <EmptyState
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
              title="Không có khách hàng nào"
              description={
                searchParams.q
                  ? "Không tìm thấy khách hàng phù hợp với từ khóa."
                  : "Khách hàng sẽ xuất hiện tại đây sau khi đăng ký."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                    <th className="px-3 py-3">Tên</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">SĐT</th>
                    <th className="px-3 py-3 text-right">Số đơn</th>
                    <th className="px-3 py-3 text-right">Tổng chi</th>
                    <th className="px-3 py-3">Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {result.customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-ink-200/60 last:border-b-0 hover:bg-cream-50"
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-ink-900 hover:text-coral-600"
                        >
                          {customer.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {customer.email}
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {customer.phone ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-ink-700">
                        {customer.orderCount}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-ink-900">
                        {formatVnd(customer.totalSpent)}
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        {formatDate(customer.createdAt)}
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
