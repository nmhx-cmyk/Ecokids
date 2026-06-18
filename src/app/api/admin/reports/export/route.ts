import * as XLSX from "xlsx";

import {
  getLowStockProducts,
  getRevenueReport,
  getSlowMovingProducts,
  getTopCustomers,
  getTopProducts,
} from "@/lib/queries/reports";
import { getCurrentUser } from "@/lib/server/user-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportType =
  | "revenue"
  | "products"
  | "customers"
  | "low-stock"
  | "slow-moving";

function parseType(value: string | null): ReportType {
  if (
    value === "products" ||
    value === "customers" ||
    value === "low-stock" ||
    value === "slow-moving"
  ) {
    return value;
  }
  return "revenue";
}

async function buildRows(
  type: ReportType,
): Promise<Record<string, string | number>[]> {
  switch (type) {
    case "products": {
      const products = await getTopProducts(100);
      return products.map((p) => ({
        "Tên sản phẩm": p.productName,
        "Mã sản phẩm": p.productSlug,
        "Đã bán": p.unitsSold,
        "Doanh thu (VND)": p.revenue,
      }));
    }
    case "customers": {
      const customers = await getTopCustomers(100);
      return customers.map((c) => ({
        "Tên khách hàng": c.name,
        Email: c.email,
        "Số đơn": c.orderCount,
        "Tổng chi (VND)": c.totalSpent,
      }));
    }
    case "low-stock": {
      const products = await getLowStockProducts(5, 100);
      return products.map((p) => ({
        "Tên sản phẩm": p.name,
        "Mã sản phẩm": p.slug,
        "Tồn kho": p.totalStock,
      }));
    }
    case "slow-moving": {
      const products = await getSlowMovingProducts(100);
      return products.map((p) => ({
        "Tên sản phẩm": p.name,
        "Mã sản phẩm": p.slug,
        "Đã bán": p.unitsSold,
      }));
    }
    case "revenue":
    default: {
      const revenue = await getRevenueReport(30);
      return revenue.byDay.map((d) => ({
        Ngày: d.date,
        "Số đơn": d.orders,
        "Doanh thu (VND)": d.revenue,
      }));
    }
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const type = parseType(new URL(request.url).searchParams.get("type"));
  const rows = await buildRows(type);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="report-${type}.xlsx"`,
    },
  });
}
