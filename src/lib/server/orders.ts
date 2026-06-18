"use server";

import { revalidatePath } from "next/cache";
import {
  InventoryReason,
  OrderStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/constants/shipping";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  placeOrderSchema,
  type PlaceOrderInput,
} from "@/lib/validations/order";

const MAX_PLACE_ORDER_RETRIES = 3;

export function padOrderCodeSeq(seq: bigint): string {
  return String(seq).padStart(6, "0");
}

async function generateOrderCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const seqName = `order_code_seq_${year}`;
  try {
    const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(
      `SELECT nextval('${seqName}') AS nextval`,
    );
    const seq = rows[0]?.nextval ?? BigInt(0);
    return `ECO-${year}-${padOrderCodeSeq(seq)}`;
  } catch {
    // Fallback if the sequence for the current year hasn't been created.
    console.warn(
      `[orders] Sequence ${seqName} not found, falling back to timestamp suffix`,
    );
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    return `ECO-${year}-${suffix}`;
  }
}

interface ItemSnapshot {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantSize: string;
  variantColor: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

async function placeOrderTransaction(
  input: PlaceOrderInput,
  userId: string,
): Promise<ServerActionResult<{ orderCode: string }>> {
  return prisma.$transaction(
    async (tx) => {
      // Lock variants FOR UPDATE so concurrent checkouts can't oversell.
      const itemsBy: Record<string, number> = {};
      for (const item of input.items) {
        itemsBy[item.variantId] = (itemsBy[item.variantId] ?? 0) + item.quantity;
      }
      const variantIds = Object.keys(itemsBy);

      type LockedRow = {
        id: string;
        stock: number;
        price: number | null;
        size: string;
        color: string;
        productId: string;
      };
      const locked = await tx.$queryRaw<LockedRow[]>`
        SELECT id, stock, price, size, color, "productId"
        FROM "ProductVariant"
        WHERE id = ANY(${variantIds}::text[])
        FOR UPDATE
      `;

      const lockedById = new Map(locked.map((row) => [row.id, row]));

      const products = await tx.product.findMany({
        where: { id: { in: locked.map((v) => v.productId) } },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          status: true,
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },
        },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const snapshots: ItemSnapshot[] = [];
      for (const item of input.items) {
        const variant = lockedById.get(item.variantId);
        if (!variant) {
          return err<{ orderCode: string }>(
            ERROR_CODES.NOT_FOUND,
            "Không tìm thấy sản phẩm trong giỏ hàng.",
            item.variantId,
          );
        }
        const product = productById.get(variant.productId);
        if (!product) {
          return err<{ orderCode: string }>(
            ERROR_CODES.NOT_FOUND,
            "Sản phẩm không còn tồn tại.",
            item.variantId,
          );
        }
        if (product.status !== ProductStatus.ACTIVE) {
          return err<{ orderCode: string }>(
            ERROR_CODES.CONFLICT,
            `Sản phẩm '${product.name}' đã ngừng bán.`,
            item.variantId,
          );
        }
        if (variant.stock < item.quantity) {
          return err<{ orderCode: string }>(
            ERROR_CODES.STOCK_INSUFFICIENT,
            `Sản phẩm '${product.name}' chỉ còn ${variant.stock} sản phẩm.`,
            item.variantId,
          );
        }

        const unitPrice = variant.price ?? product.basePrice;
        snapshots.push({
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.images[0]?.url ?? null,
          variantSize: variant.size,
          variantColor: variant.color,
          unitPrice,
          quantity: item.quantity,
          subtotal: unitPrice * item.quantity,
        });
      }

      const subtotal = snapshots.reduce((sum, s) => sum + s.subtotal, 0);
      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      const total = subtotal + shippingFee;

      const orderCode = await generateOrderCode(tx);

      const shippingAddressJson: Prisma.InputJsonValue = {
        recipientName: input.shippingAddress.recipientName,
        phone: input.shippingAddress.phone,
        province: input.shippingAddress.province,
        provinceCode: input.shippingAddress.provinceCode,
        district: input.shippingAddress.district,
        districtCode: input.shippingAddress.districtCode,
        ward: input.shippingAddress.ward,
        wardCode: input.shippingAddress.wardCode,
        addressLine: input.shippingAddress.addressLine,
      };

      await tx.order.create({
        data: {
          orderCode,
          userId,
          status: OrderStatus.PENDING,
          paymentMethod: input.paymentMethod,
          subtotal,
          shippingFee,
          total,
          note: input.note?.trim() || null,
          shippingAddress: shippingAddressJson,
          items: {
            create: snapshots.map((s) => ({
              variantId: s.variantId,
              productName: s.productName,
              productSlug: s.productSlug,
              productImage: s.productImage,
              variantSize: s.variantSize,
              variantColor: s.variantColor,
              unitPrice: s.unitPrice,
              quantity: s.quantity,
              subtotal: s.subtotal,
            })),
          },
        },
      });

      for (const s of snapshots) {
        await tx.productVariant.update({
          where: { id: s.variantId },
          data: { stock: { decrement: s.quantity } },
        });
        await tx.inventoryLog.create({
          data: {
            variantId: s.variantId,
            delta: -s.quantity,
            reason: InventoryReason.ORDER_RESERVE,
            orderCode,
            adminUserId: null,
          },
        });
      }

      if (input.saveAddress) {
        const existingCount = await tx.address.count({ where: { userId } });
        await tx.address.create({
          data: {
            userId,
            recipientName: input.shippingAddress.recipientName,
            phone: input.shippingAddress.phone,
            province: input.shippingAddress.province,
            provinceCode: input.shippingAddress.provinceCode,
            district: input.shippingAddress.district,
            districtCode: input.shippingAddress.districtCode,
            ward: input.shippingAddress.ward,
            wardCode: input.shippingAddress.wardCode,
            addressLine: input.shippingAddress.addressLine,
            isDefault: existingCount === 0,
          },
        });
      }

      return ok({ orderCode });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function isSerializationError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "40001")
  ) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /could not serialize|deadlock|40001/i.test(error.message);
  }
  return false;
}

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<ServerActionResult<{ orderCode: string }>> {
  const user = await requireUser();

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path.join(".") || undefined,
    );
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_PLACE_ORDER_RETRIES; attempt += 1) {
    try {
      const result = await placeOrderTransaction(parsed.data, user.id);
      if (result.ok) {
        revalidatePath("/account/orders");
        revalidatePath("/admin/orders");
      }
      return result;
    } catch (error) {
      lastError = error;
      if (!isSerializationError(error)) break;
    }
  }

  console.error("[placeOrder] failed", lastError);
  return err(
    ERROR_CODES.INTERNAL,
    "Hệ thống đang bận. Vui lòng thử lại trong giây lát.",
  );
}

export async function cancelOrder(
  orderCode: string,
): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  if (!orderCode) {
    return err(ERROR_CODES.VALIDATION, "Thiếu mã đơn hàng");
  }

  const order = await prisma.order.findUnique({
    where: { orderCode },
    select: {
      id: true,
      userId: true,
      status: true,
      items: { select: { variantId: true, quantity: true } },
    },
  });

  if (!order) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy đơn hàng");
  }
  if (order.userId !== user.id) {
    return err(ERROR_CODES.FORBIDDEN, "Bạn không có quyền hủy đơn hàng này");
  }
  if (order.status !== OrderStatus.PENDING) {
    return err(
      ERROR_CODES.CONFLICT,
      "Đơn hàng đã được xử lý và không thể hủy.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELED, canceledAt: new Date() },
      });
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            delta: item.quantity,
            reason: InventoryReason.ORDER_CANCEL,
            orderCode,
            adminUserId: null,
          },
        });
      }
    });

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderCode}`);
    revalidatePath("/admin/orders");
    return ok(null);
  } catch (error) {
    console.error("[cancelOrder] failed", error);
    return err(ERROR_CODES.INTERNAL, "Không thể hủy đơn hàng. Vui lòng thử lại.");
  }
}
