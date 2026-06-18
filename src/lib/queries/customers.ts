import "server-only";

import { OrderStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
}

export interface GetCustomersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GetCustomersResult {
  customers: CustomerRow[];
  total: number;
  totalPages: number;
  page: number;
}

export async function getCustomers({
  search,
  page = 1,
  pageSize = 20,
}: GetCustomersParams): Promise<GetCustomersResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const where: Prisma.UserWhereInput = { role: UserRole.USER };
  if (search && search.trim().length > 0) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const pageUserIds = users.map((u) => u.id);
  const spentByUser = new Map<string, number>();
  if (pageUserIds.length > 0) {
    const grouped = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: pageUserIds }, status: OrderStatus.COMPLETED },
      _sum: { total: true },
    });
    for (const row of grouped) {
      spentByUser.set(row.userId, row._sum.total ?? 0);
    }
  }

  const customers: CustomerRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt,
    orderCount: u._count.orders,
    totalSpent: spentByUser.get(u.id) ?? 0,
  }));

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  return { customers, total, totalPages, page: safePage };
}

export interface CustomerOrderRow {
  id: string;
  orderCode: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  itemCount: number;
}

export interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  completedOrderCount: number;
  totalSpent: number;
  orders: CustomerOrderRow[];
}

export async function getCustomerById(
  id: string,
): Promise<CustomerDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderCode: true,
          status: true,
          total: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const completedOrders = user.orders.filter(
    (o) => o.status === OrderStatus.COMPLETED,
  );
  const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    completedOrderCount: completedOrders.length,
    totalSpent,
    orders: user.orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      itemCount: o._count.items,
    })),
  };
}
