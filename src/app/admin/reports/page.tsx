import Link from "next/link";
import {
  AlertTriangle,
  Download,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RevenueLineChart } from "@/components/admin/RevenueLineChart";
import { StatBlock } from "@/components/admin/StatBlock";
import {
  getCustomerMetrics,
  getLowStockProducts,
  getRevenueReport,
  getSlowMovingProducts,
  getTopCustomers,
  getTopProducts,
} from "@/lib/queries/reports";
import { requireAdmin } from "@/lib/server/user-actions";
import { formatVnd } from "@/lib/utils/format";

export const metadata = {
  title: "Báo cáo",
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();

  const [revenue, products, customers, metrics, lowStock, slowMoving] =
    await Promise.all([
      getRevenueReport(30),
      getTopProducts(10),
      getTopCustomers(10),
      getCustomerMetrics(30),
      getLowStockProducts(5, 10),
      getSlowMovingProducts(10),
    ]);

  const chartData = revenue.byDay.map((d) => ({
    date: d.date,
    revenue: d.revenue,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">
          Báo cáo &amp; thống kê
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Doanh thu, sản phẩm bán chạy và khách hàng hàng đầu (đơn hoàn thành).
        </p>
      </header>

      <section aria-label="Doanh thu" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">Doanh thu</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/api/admin/reports/export?type=revenue">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatBlock
            title="Tổng doanh thu"
            value={formatVnd(revenue.totalRevenue)}
            delta={{ value: "30 ngày", label: "gần nhất", positive: true }}
          />
          <StatBlock
            title="Số đơn hoàn thành"
            value={String(revenue.orderCount)}
            delta={{ value: "30 ngày", label: "gần nhất", positive: true }}
          />
          <StatBlock
            title="Trung bình / ngày"
            value={formatVnd(Math.round(revenue.totalRevenue / 30))}
            delta={{ value: "30 ngày", label: "gần nhất", positive: true }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Doanh thu 30 ngày gần nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={chartData} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Khách hàng" className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-ink-900">Khách hàng</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatBlock
            title="Giá trị đơn trung bình (AOV)"
            value={formatVnd(metrics.aov)}
            delta={{ value: "30 ngày", label: "gần nhất", positive: true }}
          />
          <StatBlock
            title="Khách hàng mới"
            value={String(metrics.newCustomers)}
            delta={{ value: "30 ngày", label: "gần nhất", positive: true }}
          />
          <StatBlock
            title="Khách hàng quay lại"
            value={String(metrics.returningCustomers)}
            delta={{
              value: `${metrics.totalCustomersWithOrders} KH`,
              label: "có đơn",
              positive: true,
            }}
          />
        </div>
      </section>

      <section aria-label="Sắp hết hàng" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">Sắp hết hàng</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/api/admin/reports/export?type=low-stock">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
                title="Không có sản phẩm sắp hết"
                description="Tất cả sản phẩm đang hoạt động đều còn đủ tồn kho."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Tên SP</th>
                    <th className="px-4 py-3 text-right font-medium">Tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-coral-500 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">
                        {p.totalStock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Bán chậm" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">Bán chậm</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/api/admin/reports/export?type=slow-moving">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {slowMoving.length === 0 ? (
              <EmptyState
                icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
                title="Chưa có dữ liệu"
                description="Chưa có sản phẩm đang hoạt động nào."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Tên SP</th>
                    <th className="px-4 py-3 text-right font-medium">Đã bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {slowMoving.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-coral-500 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-700">
                        {p.unitsSold}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Sản phẩm bán chạy" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">
            Sản phẩm bán chạy
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/api/admin/reports/export?type=products">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-5 w-5" aria-hidden="true" />}
                title="Chưa có dữ liệu"
                description="Chưa có sản phẩm nào được bán trong đơn hoàn thành."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Tên SP</th>
                    <th className="px-4 py-3 text-right font-medium">Đã bán</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Doanh thu
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {products.map((p) => (
                    <tr key={p.productSlug}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {p.productName}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-700">
                        {p.unitsSold}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">
                        {formatVnd(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Khách hàng hàng đầu" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">
            Khách hàng hàng đầu
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/api/admin/reports/export?type=customers">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {customers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" aria-hidden="true" />}
                title="Chưa có dữ liệu"
                description="Chưa có khách hàng nào hoàn thành đơn."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3 font-medium">Tên</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 text-right font-medium">Số đơn</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Tổng chi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {customers.map((c) => (
                    <tr key={c.userId}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-ink-700">{c.email}</td>
                      <td className="px-4 py-3 text-right text-ink-700">
                        {c.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">
                        {formatVnd(c.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="flex items-center gap-2 text-xs text-ink-500">
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        Doanh thu chỉ tính từ các đơn đã hoàn thành.
      </p>
    </div>
  );
}
