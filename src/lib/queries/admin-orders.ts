import "server-only";

import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AdminOrderSort = "newest" | "oldest" | "total-desc";

export interface GetAdminOrdersParams {
  q?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  pageSize?: number;
  sort?: AdminOrderSort;
}

export interface AdminOrderListItem {
  id: string;
  orderCode: string;
  status: OrderStatus;
  paymentMethod: "COD" | "BANK_TRANSFER";
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: Date;
  itemsCount: number;
  firstItemImage: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

export interface GetAdminOrdersResult {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function buildOrderBy(
  sort: AdminOrderSort,
): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "total-desc":
      return { total: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function getAdminOrders(
  params: GetAdminOrdersParams = {},
): Promise<GetAdminOrdersResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const sort = params.sort ?? "newest";

  const where: Prisma.OrderWhereInput = {};
  if (params.status) {
    where.status = params.status;
  }
  if (params.paymentStatus) {
    where.paymentStatus = params.paymentStatus;
  }
  if (params.q && params.q.trim().length > 0) {
    const q = params.q.trim();
    where.OR = [
      { orderCode: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          select: { productImage: true },
          take: 1,
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const items: AdminOrderListItem[] = rows.map((row) => ({
    id: row.id,
    orderCode: row.orderCode,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    total: row.total,
    createdAt: row.createdAt,
    itemsCount: row._count.items,
    firstItemImage: row.items[0]?.productImage ?? null,
    user: row.user,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, pageSize, totalPages };
}

const adminOrderDetailInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          colorHex: true,
          product: {
            select: { id: true, slug: true, name: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.OrderInclude;

export type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: typeof adminOrderDetailInclude;
}>;

export async function getAdminOrderByCode(
  orderCode: string,
): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({
    where: { orderCode },
    include: adminOrderDetailInclude,
  });
}

export interface DashboardStats {
  todayOrderCount: number;
  yesterdayOrderCount: number;
  todayRevenue: number;
  yesterdayRevenue: number;
  pendingOrderCount: number;
  lowStockVariantCount: number;
  last7DaysOrders: Array<{ date: string; count: number; revenue: number }>;
  recentOrders: Array<{
    id: string;
    orderCode: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    total: number;
    createdAt: Date;
    customerName: string;
  }>;
  lowStockVariants: Array<{
    variantId: string;
    productId: string;
    productName: string;
    productSlug: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
  }>;
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);
  const sevenDaysAgo = addDays(todayStart, -6); // include today => 7 buckets

  const [
    todayOrderCount,
    yesterdayOrderCount,
    todayRevenueAgg,
    yesterdayRevenueAgg,
    pendingOrderCount,
    lowStockVariantCount,
    last7DaysRows,
    recentOrdersRaw,
    lowStockVariantsRaw,
  ] = await Promise.all([
    prisma.order.count({
      where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
    }),
    prisma.order.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        paymentStatus: PaymentStatus.PAID,
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        paymentStatus: PaymentStatus.PAID,
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    prisma.productVariant.count({ where: { stock: { lt: 5 } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo, lt: tomorrowStart } },
      select: {
        createdAt: true,
        total: true,
        paymentStatus: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderCode: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.productVariant.findMany({
      where: { stock: { lt: 5 } },
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        stock: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  // Bucket last 7 days revenue + count.
  const buckets = new Map<string, { count: number; revenue: number }>();
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(sevenDaysAgo, i);
    buckets.set(toIsoDate(day), { count: 0, revenue: 0 });
  }
  for (const row of last7DaysRows) {
    const key = toIsoDate(startOfDay(row.createdAt));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    if (row.paymentStatus === PaymentStatus.PAID) {
      bucket.revenue += row.total;
    }
  }
  const last7DaysOrders = Array.from(buckets.entries()).map(
    ([date, value]) => ({
      date,
      count: value.count,
      revenue: value.revenue,
    }),
  );

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderCode: o.orderCode,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    createdAt: o.createdAt,
    customerName: o.user.name ?? o.user.email,
  }));

  const lowStockVariants = lowStockVariantsRaw.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    productName: v.product.name,
    productSlug: v.product.slug,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stock,
  }));

  return {
    todayOrderCount,
    yesterdayOrderCount,
    todayRevenue: todayRevenueAgg._sum.total ?? 0,
    yesterdayRevenue: yesterdayRevenueAgg._sum.total ?? 0,
    pendingOrderCount,
    lowStockVariantCount,
    last7DaysOrders,
    recentOrders,
    lowStockVariants,
  };
}
