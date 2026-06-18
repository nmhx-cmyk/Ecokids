"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/user-actions";
import { ERROR_CODES } from "@/lib/constants/error-codes";
import {
  ok,
  err,
  type ServerActionResult,
} from "@/lib/types/server-action";
import { productSchema, variantSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils/slug";

// ============================================
// Input shapes
// ============================================

const productImageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().url("URL ảnh không hợp lệ"),
  alt: z.string().max(255).default(""),
  sortOrder: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

const variantInputSchema = variantSchema.extend({
  // SKU may be empty on input — we auto-generate.
  sku: z.string().max(64).optional(),
  // Allow updating an existing variant by id.
  id: z.string().optional(),
});

const productCreateSchema = productSchema.and(
  z.object({
    images: z
      .array(productImageInputSchema)
      .min(1, "Cần ít nhất 1 ảnh sản phẩm")
      .max(10, "Tối đa 10 ảnh"),
    variants: z
      .array(variantInputSchema)
      .min(1, "Cần ít nhất 1 biến thể"),
  }),
);

const productUpdateSchema = productCreateSchema;

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ============================================
// Helpers
// ============================================

function buildSku(productSlug: string, size: string, color: string): string {
  const parts = [
    slugify(productSlug).toUpperCase(),
    slugify(size).toUpperCase(),
    slugify(color).toUpperCase(),
  ].filter((p) => p.length > 0);
  return parts.join("-");
}

function firstZodIssue(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0];
  if (!issue) return { message: "Dữ liệu không hợp lệ" };
  return {
    message: issue.message,
    field: issue.path.length > 0 ? issue.path.join(".") : undefined,
  };
}

async function ensureUniqueSlug(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return true;
  return excludeId !== undefined && existing.id === excludeId;
}

async function ensureUniqueSkus(skus: string[], excludeProductId?: string): Promise<string | null> {
  if (skus.length === 0) return null;
  const conflicts = await prisma.productVariant.findMany({
    where: {
      sku: { in: skus },
      ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
    },
    select: { sku: true },
  });
  return conflicts[0]?.sku ?? null;
}

// ============================================
// createProduct
// ============================================

export async function createProduct(
  input: ProductCreateInput,
): Promise<ServerActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstZodIssue(parsed.error);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  // Slug: use provided or derive from name.
  const slug = data.slug && data.slug.length > 0 ? data.slug : slugify(data.name);
  if (!slug) {
    return err(ERROR_CODES.VALIDATION, "Không thể tạo slug từ tên", "slug");
  }
  if (!(await ensureUniqueSlug(slug))) {
    return err(ERROR_CODES.CONFLICT, "Slug đã tồn tại, vui lòng chọn slug khác", "slug");
  }

  // Auto-generate missing SKUs and check uniqueness.
  const variantsWithSku = data.variants.map((v) => ({
    ...v,
    sku: v.sku && v.sku.length > 0 ? v.sku : buildSku(slug, v.size, v.color),
  }));

  const skuList = variantsWithSku.map((v) => v.sku);
  const dupeInPayload = skuList.find((s, i) => skuList.indexOf(s) !== i);
  if (dupeInPayload) {
    return err(
      ERROR_CODES.CONFLICT,
      `SKU trùng lặp trong danh sách biến thể: ${dupeInPayload}`,
      "variants",
    );
  }
  const conflict = await ensureUniqueSkus(skuList);
  if (conflict) {
    return err(ERROR_CODES.CONFLICT, `SKU đã tồn tại: ${conflict}`, "variants");
  }

  // Ensure exactly one primary image.
  const hasPrimary = data.images.some((img) => img.isPrimary);
  const preparedImages = data.images.map((img, index) => ({
    url: img.url,
    alt: img.alt ?? "",
    sortOrder: img.sortOrder ?? index,
    isPrimary: hasPrimary ? Boolean(img.isPrimary) : index === 0,
  }));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          ageRange: data.ageRange,
          gender: data.gender,
          basePrice: data.basePrice,
          comparePrice: data.comparePrice ?? null,
          status: data.status,
          material: data.material ?? null,
          origin: data.origin ?? null,
          careGuide: data.careGuide ?? null,
          images: { create: preparedImages },
          variants: {
            create: variantsWithSku.map((v) => ({
              sku: v.sku,
              size: v.size,
              sizeNote: v.sizeNote ?? null,
              color: v.color,
              colorHex: v.colorHex ?? null,
              price: v.price ?? null,
              stock: v.stock,
            })),
          },
        },
        select: { id: true, slug: true },
      });
      return product;
    });

    revalidatePath("/admin/products");
    revalidatePath(`/products/${created.slug}`);
    return ok(created);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(ERROR_CODES.CONFLICT, "Slug hoặc SKU đã tồn tại");
    }
    return err(ERROR_CODES.INTERNAL, "Không thể tạo sản phẩm");
  }
}

// ============================================
// updateProduct
// ============================================

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<ServerActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { select: { id: true } },
      variants: { select: { id: true, sku: true } },
    },
  });
  if (!existing) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy sản phẩm");
  }

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstZodIssue(parsed.error);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const slug = data.slug && data.slug.length > 0 ? data.slug : slugify(data.name);
  if (!slug) {
    return err(ERROR_CODES.VALIDATION, "Không thể tạo slug từ tên", "slug");
  }
  if (!(await ensureUniqueSlug(slug, id))) {
    return err(ERROR_CODES.CONFLICT, "Slug đã tồn tại, vui lòng chọn slug khác", "slug");
  }

  // Variants: split into existing (have id) and new.
  const existingVariantIds = new Set(existing.variants.map((v) => v.id));
  const submittedVariantIds = new Set(
    data.variants.map((v) => v.id).filter((vid): vid is string => Boolean(vid)),
  );

  const variantIdsToDelete = existing.variants
    .map((v) => v.id)
    .filter((vid) => !submittedVariantIds.has(vid));

  // Block deletion if any of those variants are referenced by OrderItems.
  if (variantIdsToDelete.length > 0) {
    const blocked = await prisma.orderItem.findFirst({
      where: { variantId: { in: variantIdsToDelete } },
      select: { variantId: true },
    });
    if (blocked) {
      return err(
        ERROR_CODES.CONFLICT,
        "Không thể xoá biến thể đã có đơn hàng. Hãy lưu trữ sản phẩm thay vì xoá.",
        "variants",
      );
    }
  }

  // Generate/keep SKUs and ensure uniqueness across the catalogue.
  const variantsWithSku = data.variants.map((v) => ({
    ...v,
    sku: v.sku && v.sku.length > 0 ? v.sku : buildSku(slug, v.size, v.color),
  }));

  const skuList = variantsWithSku.map((v) => v.sku);
  const dupeInPayload = skuList.find((s, i) => skuList.indexOf(s) !== i);
  if (dupeInPayload) {
    return err(
      ERROR_CODES.CONFLICT,
      `SKU trùng lặp trong danh sách biến thể: ${dupeInPayload}`,
      "variants",
    );
  }
  const conflict = await ensureUniqueSkus(skuList, id);
  if (conflict) {
    return err(ERROR_CODES.CONFLICT, `SKU đã tồn tại: ${conflict}`, "variants");
  }

  // Images: split similarly. Treat image without id as new; absent ids = delete.
  const submittedImages = data.images;
  const existingImageIds = new Set(existing.images.map((img) => img.id));
  const submittedImageIds = new Set(
    submittedImages.map((img) => img.id).filter((iid): iid is string => Boolean(iid)),
  );
  const imageIdsToDelete = existing.images
    .map((img) => img.id)
    .filter((iid) => !submittedImageIds.has(iid));

  // Normalize primary flag — exactly one primary.
  const hasPrimary = submittedImages.some((img) => img.isPrimary);
  const normalizedImages = submittedImages.map((img, index) => ({
    id: img.id,
    url: img.url,
    alt: img.alt ?? "",
    sortOrder: img.sortOrder ?? index,
    isPrimary: hasPrimary ? Boolean(img.isPrimary) : index === 0,
  }));

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Update product fields.
      await tx.product.update({
        where: { id },
        data: {
          slug,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          ageRange: data.ageRange,
          gender: data.gender,
          basePrice: data.basePrice,
          comparePrice: data.comparePrice ?? null,
          status: data.status,
          material: data.material ?? null,
          origin: data.origin ?? null,
          careGuide: data.careGuide ?? null,
        },
      });

      // 2) Images sync.
      if (imageIdsToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: imageIdsToDelete } },
        });
      }
      for (const img of normalizedImages) {
        if (img.id && existingImageIds.has(img.id)) {
          await tx.productImage.update({
            where: { id: img.id },
            data: {
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId: id,
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            },
          });
        }
      }

      // 3) Variants sync.
      if (variantIdsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: variantIdsToDelete } },
        });
      }
      for (const v of variantsWithSku) {
        if (v.id && existingVariantIds.has(v.id)) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              sku: v.sku,
              size: v.size,
              sizeNote: v.sizeNote ?? null,
              color: v.color,
              colorHex: v.colorHex ?? null,
              price: v.price ?? null,
              stock: v.stock,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: v.sku,
              size: v.size,
              sizeNote: v.sizeNote ?? null,
              color: v.color,
              colorHex: v.colorHex ?? null,
              price: v.price ?? null,
              stock: v.stock,
            },
          });
        }
      }
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath(`/products/${slug}`);
    return ok({ id, slug });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(ERROR_CODES.CONFLICT, "Slug hoặc SKU đã tồn tại");
    }
    return err(ERROR_CODES.INTERNAL, "Không thể cập nhật sản phẩm");
  }
}

// ============================================
// deleteProduct
// ============================================

export async function deleteProduct(
  id: string,
): Promise<ServerActionResult<{ archived: boolean }>> {
  await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy sản phẩm");
  }

  // If any variant of this product is referenced by an OrderItem, archive.
  const referenced = await prisma.orderItem.findFirst({
    where: { variant: { productId: id } },
    select: { id: true },
  });

  try {
    if (referenced) {
      await prisma.product.update({
        where: { id },
        data: { status: ProductStatus.ARCHIVED },
      });
      revalidatePath("/admin/products");
      revalidatePath(`/products/${existing.slug}`);
      return ok({ archived: true });
    }

    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
    revalidatePath(`/products/${existing.slug}`);
    return ok({ archived: false });
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể xoá sản phẩm");
  }
}

// ============================================
// duplicateProduct (Sprint 2 nice-to-have)
// ============================================

export async function duplicateProduct(
  id: string,
): Promise<ServerActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const source = await prisma.product.findUnique({
    where: { id },
    include: { images: true, variants: true },
  });
  if (!source) {
    return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy sản phẩm gốc");
  }

  // Find a free copy slug.
  let copySlug = `${source.slug}-copy`;
  let suffix = 2;
  while (!(await ensureUniqueSlug(copySlug))) {
    copySlug = `${source.slug}-copy-${suffix}`;
    suffix += 1;
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          slug: copySlug,
          name: `${source.name} (bản sao)`,
          description: source.description,
          categoryId: source.categoryId,
          ageRange: source.ageRange,
          gender: source.gender,
          basePrice: source.basePrice,
          comparePrice: source.comparePrice,
          status: ProductStatus.DRAFT,
          material: source.material,
          origin: source.origin,
          careGuide: source.careGuide,
          images: {
            create: source.images.map((img) => ({
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            })),
          },
          variants: {
            create: source.variants.map((v) => ({
              sku: buildSku(copySlug, v.size, v.color),
              size: v.size,
              sizeNote: v.sizeNote,
              color: v.color,
              colorHex: v.colorHex,
              price: v.price,
              stock: 0,
            })),
          },
        },
        select: { id: true, slug: true },
      });
    });

    revalidatePath("/admin/products");
    return ok(created);
  } catch {
    return err(ERROR_CODES.INTERNAL, "Không thể nhân bản sản phẩm");
  }
}
