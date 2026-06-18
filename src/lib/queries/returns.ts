import "server-only";
import { Prisma, ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AdminReturnRow {
  id: string;
  status: ReturnStatus;
  reason: string;
  adminNote: string | null;
  createdAt: Date;
  orderCode: string;
  orderTotal: number;
  customerName: string;
  customerEmail: string;
}

export async function getReturnRequests(
  status?: ReturnStatus,
): Promise<AdminReturnRow[]> {
  const where: Prisma.ReturnRequestWhereInput = status ? { status } : {};
  const rows = await prisma.returnRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      adminNote: true,
      createdAt: true,
      order: { select: { orderCode: true, total: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    adminNote: r.adminNote,
    createdAt: r.createdAt,
    orderCode: r.order.orderCode,
    orderTotal: r.order.total,
    customerName: r.user.name?.trim() || r.user.email,
    customerEmail: r.user.email,
  }));
}

export async function getPendingReturnCount(): Promise<number> {
  return prisma.returnRequest.count({ where: { status: ReturnStatus.REQUESTED } });
}
