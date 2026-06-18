"use server";

import { revalidatePath } from "next/cache";
import {
  InventoryReason,
  OrderStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { PAYOS_EXPIRE_MINUTES } from "@/lib/constants/payment";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/constants/shipping";
import { isPayosConfigured } from "@/lib/payos";
import { prisma } from "@/lib/prisma";
import { computeVoucherDiscount, effectiveUnitPrice } from "@/lib/pricing";
import { sendOrderPlacedEmail } from "@/lib/server/emails";
import { createPayosCheckout } from "@/lib/server/payos-payment";
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

function padOrderCodeSeq(seq: bigint): string {
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

interface PlacedOrder {
  orderCode: string;
  orderId: string;
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
  paymentMethod: PlaceOrderInput["paymentMethod"];
  payosOrderCode: bigint | null;
  recipientName: string;
  emailItems: {
    productName: string;
    variantSize: string;
    variantColor: string;
    quantity: number;
    subtotal: number;
  }[];
}

async function placeOrderTransaction(
  input: PlaceOrderInput,
  userId: string,
): Promise<ServerActionResult<PlacedOrder>> {
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

      // Active flash-sale prices for the products in this cart (authoritative).
      const now = new Date();
      const flashItems = await tx.flashSaleItem.findMany({
        where: {
          productId: { in: products.map((p) => p.id) },
          flashSale: {
            isActive: true,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        },
        select: { productId: true, salePrice: true },
      });
      const flashPriceByProduct = new Map<string, number>();
      for (const fi of flashItems) {
        const cur = flashPriceByProduct.get(fi.productId);
        if (cur === undefined || fi.salePrice < cur) {
          flashPriceByProduct.set(fi.productId, fi.salePrice);
        }
      }

      const snapshots: ItemSnapshot[] = [];
      for (const item of input.items) {
        const variant = lockedById.get(item.variantId);
        if (!variant) {
          return err<PlacedOrder>(
            ERROR_CODES.NOT_FOUND,
            "Không tìm thấy sản phẩm trong giỏ hàng.",
            item.variantId,
          );
        }
        const product = productById.get(variant.productId);
        if (!product) {
          return err<PlacedOrder>(
            ERROR_CODES.NOT_FOUND,
            "Sản phẩm không còn tồn tại.",
            item.variantId,
          );
        }
        if (product.status !== ProductStatus.ACTIVE) {
          return err<PlacedOrder>(
            ERROR_CODES.CONFLICT,
            `Sản phẩm '${product.name}' đã ngừng bán.`,
            item.variantId,
          );
        }
        if (variant.stock < item.quantity) {
          return err<PlacedOrder>(
            ERROR_CODES.STOCK_INSUFFICIENT,
            `Sản phẩm '${product.name}' chỉ còn ${variant.stock} sản phẩm.`,
            item.variantId,
          );
        }

        const unitPrice = effectiveUnitPrice(
          product.basePrice,
          variant.price,
          flashPriceByProduct.get(product.id) ?? null,
        );
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

      // Voucher: validate + (later) consume atomically inside this serializable txn.
      let discountTotal = 0;
      let appliedVoucherId: string | null = null;
      let appliedVoucherCode: string | null = null;
      if (input.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: input.voucherCode },
        });
        if (!voucher || !voucher.isActive) {
          return err<PlacedOrder>(
            ERROR_CODES.VALIDATION,
            "Mã giảm giá không khả dụng.",
            "voucherCode",
          );
        }
        if (now < voucher.startsAt || now > voucher.endsAt) {
          return err<PlacedOrder>(
            ERROR_CODES.VALIDATION,
            "Mã giảm giá đã hết hạn hoặc chưa có hiệu lực.",
            "voucherCode",
          );
        }
        if (voucher.usageLimit !== null && voucher.usageCount >= voucher.usageLimit) {
          return err<PlacedOrder>(
            ERROR_CODES.VALIDATION,
            "Mã giảm giá đã hết lượt sử dụng.",
            "voucherCode",
          );
        }
        if (subtotal < voucher.minOrderValue) {
          return err<PlacedOrder>(
            ERROR_CODES.VALIDATION,
            "Đơn hàng chưa đạt giá trị tối thiểu để dùng mã.",
            "voucherCode",
          );
        }
        if (voucher.perUserLimit !== null) {
          const used = await tx.voucherRedemption.count({
            where: { voucherId: voucher.id, userId },
          });
          if (used >= voucher.perUserLimit) {
            return err<PlacedOrder>(
              ERROR_CODES.VALIDATION,
              "Bạn đã sử dụng mã này rồi.",
              "voucherCode",
            );
          }
        }
        discountTotal = computeVoucherDiscount(voucher, subtotal);
        if (discountTotal <= 0) {
          return err<PlacedOrder>(
            ERROR_CODES.VALIDATION,
            "Mã giảm giá không áp dụng được cho đơn này.",
            "voucherCode",
          );
        }
        appliedVoucherId = voucher.id;
        appliedVoucherCode = voucher.code;
      }

      const total = subtotal + shippingFee - discountTotal;

      const orderCode = await generateOrderCode(tx);

      // PayOS needs a unique numeric order code + a link-expiry timestamp.
      let payosOrderCode: bigint | null = null;
      let paymentExpiresAt: Date | null = null;
      if (input.paymentMethod === "PAYOS") {
        const seqRows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(
          `SELECT nextval('payos_order_code_seq') AS nextval`,
        );
        payosOrderCode = seqRows[0]?.nextval ?? null;
        paymentExpiresAt = new Date(
          Date.now() + PAYOS_EXPIRE_MINUTES * 60 * 1000,
        );
      }

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

      const created = await tx.order.create({
        select: { id: true },
        data: {
          orderCode,
          userId,
          status: OrderStatus.PENDING,
          paymentMethod: input.paymentMethod,
          payosOrderCode,
          paymentExpiresAt,
          subtotal,
          shippingFee,
          discountTotal,
          voucherCode: appliedVoucherCode,
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

      if (appliedVoucherId) {
        await tx.voucher.update({
          where: { id: appliedVoucherId },
          data: { usageCount: { increment: 1 } },
        });
        await tx.voucherRedemption.create({
          data: {
            voucherId: appliedVoucherId,
            userId,
            orderId: created.id,
            discount: discountTotal,
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

      return ok({
        orderCode,
        orderId: created.id,
        subtotal,
        shippingFee,
        discountTotal,
        total,
        paymentMethod: input.paymentMethod,
        payosOrderCode,
        recipientName: input.shippingAddress.recipientName,
        emailItems: snapshots.map((s) => ({
          productName: s.productName,
          variantSize: s.variantSize,
          variantColor: s.variantColor,
          quantity: s.quantity,
          subtotal: s.subtotal,
        })),
      });
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

/**
 * Cancels a reserved order and restores its stock. Used to roll back when the
 * PayOS link cannot be created after the order was already persisted.
 */
async function rollbackReservedOrder(
  orderId: string,
  orderCode: string,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({
        where: { orderId },
        select: { variantId: true, quantity: true },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELED, canceledAt: new Date() },
      });
      for (const item of items) {
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
            note: "Auto-cancel: PayOS link creation failed",
            adminUserId: null,
          },
        });
      }
    });
  } catch (error) {
    console.error(`[rollbackReservedOrder] failed for ${orderCode}`, error);
  }
}

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<ServerActionResult<{ orderCode: string; checkoutUrl?: string }>> {
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

  if (parsed.data.paymentMethod === "PAYOS" && !isPayosConfigured) {
    return err(
      ERROR_CODES.INTERNAL,
      "Thanh toán online tạm thời chưa khả dụng. Vui lòng chọn COD.",
    );
  }

  let placed: PlacedOrder | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_PLACE_ORDER_RETRIES; attempt += 1) {
    try {
      const result = await placeOrderTransaction(parsed.data, user.id);
      if (!result.ok) return result;
      placed = result.data;
      break;
    } catch (error) {
      lastError = error;
      if (!isSerializationError(error)) break;
    }
  }

  if (!placed) {
    console.error("[placeOrder] failed", lastError);
    return err(
      ERROR_CODES.INTERNAL,
      "Hệ thống đang bận. Vui lòng thử lại trong giây lát.",
    );
  }

  revalidatePath("/account/orders");
  revalidatePath("/admin/orders");

  // Order-confirmation email (env-gated; never throws, no-ops without RESEND_API_KEY).
  const emailData = {
    orderCode: placed.orderCode,
    recipientName: placed.recipientName,
    items: placed.emailItems,
    subtotal: placed.subtotal,
    shippingFee: placed.shippingFee,
    discountTotal: placed.discountTotal,
    total: placed.total,
  };

  if (placed.paymentMethod === "PAYOS" && placed.payosOrderCode !== null) {
    try {
      const { checkoutUrl, paymentLinkId } = await createPayosCheckout({
        orderCode: placed.orderCode,
        payosOrderCode: placed.payosOrderCode,
        amount: placed.total,
        recipientName: placed.recipientName,
      });
      await prisma.order.update({
        where: { id: placed.orderId },
        data: { paymentLinkId, paymentCheckoutUrl: checkoutUrl },
      });
      if (user.email) await sendOrderPlacedEmail(user.email, emailData);
      return ok({ orderCode: placed.orderCode, checkoutUrl });
    } catch (error) {
      console.error("[placeOrder] PayOS link creation failed", error);
      await rollbackReservedOrder(placed.orderId, placed.orderCode);
      return err(
        ERROR_CODES.INTERNAL,
        "Không tạo được liên kết thanh toán. Đơn đã được hủy, vui lòng thử lại.",
      );
    }
  }

  if (user.email) await sendOrderPlacedEmail(user.email, emailData);
  return ok({ orderCode: placed.orderCode });
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
