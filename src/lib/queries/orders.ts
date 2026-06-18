import "server-only";
import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const orderInclude = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          colorHex: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export interface GetMyOrdersParams {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

export interface GetMyOrdersResult {
  items: OrderWithItems[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getOrderByCode(
  orderCode: string,
  userId?: string | null,
): Promise<OrderWithItems | null> {
  const where: Prisma.OrderWhereInput = { orderCode };
  if (userId) {
    where.userId = userId;
  }

  const order = await prisma.order.findFirst({
    where,
    include: orderInclude,
  });

  return order;
}

// Caller must enforce admin access before calling this.
export async function getOrderForAdmin(
  orderCode: string,
): Promise<OrderWithItems | null> {
  return prisma.order.findUnique({
    where: { orderCode },
    include: orderInclude,
  });
}

export async function getMyOrders(
  userId: string,
  params: GetMyOrdersParams = {},
): Promise<GetMyOrdersResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));

  const where: Prisma.OrderWhereInput = { userId };
  if (params.status) {
    where.status = params.status;
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, pageSize, totalPages };
}
