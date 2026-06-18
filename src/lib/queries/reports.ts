import "server-only";

import { OrderStatus, ProductStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Admin report queries.
 *
 * Revenue is counted from COMPLETED orders only.
 */

export interface RevenueReport {
  totalRevenue: number;
  orderCount: number;
  byDay: { date: string; revenue: number; orders: number }[];
}

export interface TopProduct {
  productName: string;
  productSlug: string;
  unitsSold: number;
  revenue: number;
}

export interface TopCustomer {
  userId: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
}

export interface CustomerMetrics {
  aov: number;
  newCustomers: number;
  returningCustomers: number;
  totalCustomersWithOrders: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  totalStock: number;
}

export interface SlowMovingProduct {
  id: string;
  name: string;
  slug: string;
  unitsSold: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getRevenueReport(days = 30): Promise<RevenueReport> {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const rangeStart = addDays(todayStart, -(days - 1)); // include today => `days` buckets

  const rows = await prisma.order.findMany({
    where: {
      status: OrderStatus.COMPLETED,
      createdAt: { gte: rangeStart, lt: tomorrowStart },
    },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(toIsoDate(addDays(rangeStart, i)), { revenue: 0, orders: 0 });
  }

  let totalRevenue = 0;
  for (const row of rows) {
    totalRevenue += row.total;
    const key = toIsoDate(startOfDay(row.createdAt));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += row.total;
    bucket.orders += 1;
  }

  const byDay = Array.from(buckets.entries()).map(([date, value]) => ({
    date,
    revenue: value.revenue,
    orders: value.orders,
  }));

  return { totalRevenue, orderCount: rows.length, byDay };
}

export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productSlug", "productName"],
    where: { order: { status: OrderStatus.COMPLETED } },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  return grouped.map((row) => ({
    productName: row.productName,
    productSlug: row.productSlug,
    unitsSold: row._sum.quantity ?? 0,
    revenue: row._sum.subtotal ?? 0,
  }));
}

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { status: OrderStatus.COMPLETED },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: "desc" } },
    take: limit,
  });

  const userIds = grouped.map((row) => row.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((row) => {
      const user = userById.get(row.userId);
      return {
        userId: row.userId,
        name: user?.name ?? user?.email ?? "",
        email: user?.email ?? "",
        orderCount: row._count._all,
        totalSpent: row._sum.total ?? 0,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function getCustomerMetrics(days = 30): Promise<CustomerMetrics> {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const rangeStart = addDays(todayStart, -(days - 1));

  const ordersInWindow = await prisma.order.findMany({
    where: {
      status: OrderStatus.COMPLETED,
      createdAt: { gte: rangeStart, lt: tomorrowStart },
    },
    select: { userId: true, total: true },
  });

  const aov =
    ordersInWindow.length === 0
      ? 0
      : Math.round(
          ordersInWindow.reduce((sum, o) => sum + o.total, 0) /
            ordersInWindow.length,
        );

  const usersInWindow = Array.from(
    new Set(ordersInWindow.map((o) => o.userId)),
  );

  if (usersInWindow.length === 0) {
    return { aov, newCustomers: 0, returningCustomers: 0, totalCustomersWithOrders: 0 };
  }

  // First-ever completed order per user (to classify new vs existing).
  const firstOrders = await prisma.order.groupBy({
    by: ["userId"],
    where: { status: OrderStatus.COMPLETED, userId: { in: usersInWindow } },
    _min: { createdAt: true },
    _count: { _all: true },
  });

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const row of firstOrders) {
    const firstAt = row._min.createdAt;
    if (firstAt && firstAt >= rangeStart && firstAt < tomorrowStart) {
      newCustomers += 1;
    }
    if (row._count._all >= 2) {
      returningCustomers += 1;
    }
  }

  return {
    aov,
    newCustomers,
    returningCustomers,
    totalCustomersWithOrders: usersInWindow.length,
  };
}

export async function getLowStockProducts(
  threshold = 5,
  limit = 10,
): Promise<LowStockProduct[]> {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      slug: true,
      variants: { select: { stock: true } },
    },
  });

  return products
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    }))
    .filter((p) => p.totalStock <= threshold)
    .sort((a, b) => a.totalStock - b.totalStock)
    .slice(0, limit);
}

export async function getSlowMovingProducts(
  limit = 10,
): Promise<SlowMovingProduct[]> {
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: { id: true, name: true, slug: true },
  });

  const sold = await prisma.orderItem.groupBy({
    by: ["productSlug"],
    where: { order: { status: OrderStatus.COMPLETED } },
    _sum: { quantity: true },
  });
  const soldBySlug = new Map(
    sold.map((row) => [row.productSlug, row._sum.quantity ?? 0]),
  );

  return products
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      unitsSold: soldBySlug.get(p.slug) ?? 0,
    }))
    .sort((a, b) => a.unitsSold - b.unitsSold)
    .slice(0, limit);
}
