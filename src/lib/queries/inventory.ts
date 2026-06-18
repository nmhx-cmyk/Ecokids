import "server-only";

import type { InventoryReason, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type InventoryListItem = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sku: string;
  size: string;
  sizeNote: string | null;
  color: string;
  colorHex: string | null;
  price: number | null;
  stock: number;
};

export type InventoryListResult = {
  items: InventoryListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export const LOW_STOCK_THRESHOLD = 5;
const DEFAULT_PAGE_SIZE = 20;

export async function getInventoryList(params: {
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<InventoryListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
  const search = params.search?.trim() ?? "";

  const where: Prisma.ProductVariantWhereInput = {};
  if (params.lowStockOnly) {
    where.stock = { lt: LOW_STOCK_THRESHOLD };
  }
  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({
      where,
      orderBy: [{ stock: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        size: true,
        sizeNote: true,
        color: true,
        colorHex: true,
        price: true,
        stock: true,
        productId: true,
        product: {
          select: {
            name: true,
            slug: true,
            images: {
              where: { isPrimary: true },
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    }),
  ]);

  const items: InventoryListItem[] = rows.map((row) => ({
    variantId: row.id,
    productId: row.productId,
    productName: row.product.name,
    productSlug: row.product.slug,
    productImage: row.product.images[0]?.url ?? null,
    sku: row.sku,
    size: row.size,
    sizeNote: row.sizeNote,
    color: row.color,
    colorHex: row.colorHex,
    price: row.price,
    stock: row.stock,
  }));

  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    pageSize,
  };
}

export type InventoryLogItem = {
  id: string;
  createdAt: Date;
  delta: number;
  reason: InventoryReason;
  note: string | null;
  orderCode: string | null;
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantSize: string;
  variantColor: string;
  adminName: string | null;
};

export type InventoryLogsResult = {
  items: InventoryLogItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export async function getInventoryLogs(params: {
  variantId?: string;
  page?: number;
  pageSize?: number;
}): Promise<InventoryLogsResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.max(1, Math.min(200, Math.floor(params.pageSize ?? 50)));

  const where: Prisma.InventoryLogWhereInput = {};
  if (params.variantId) {
    where.variantId = params.variantId;
  }

  const [total, rows] = await Promise.all([
    prisma.inventoryLog.count({ where }),
    prisma.inventoryLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        delta: true,
        reason: true,
        note: true,
        orderCode: true,
        variantId: true,
        variant: {
          select: {
            sku: true,
            size: true,
            color: true,
            product: { select: { name: true, slug: true } },
          },
        },
        adminUser: { select: { name: true } },
      },
    }),
  ]);

  const items: InventoryLogItem[] = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    delta: row.delta,
    reason: row.reason,
    note: row.note,
    orderCode: row.orderCode,
    variantId: row.variantId,
    sku: row.variant.sku,
    productName: row.variant.product.name,
    productSlug: row.variant.product.slug,
    variantSize: row.variant.size,
    variantColor: row.variant.color,
    adminName: row.adminUser?.name ?? null,
  }));

  return {
    items,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
    pageSize,
  };
}
