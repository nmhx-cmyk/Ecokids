'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/server/user-actions';
import {
  categorySchema,
  categoryUpdateSchema,
  type CategoryInput,
  type CategoryUpdateInput,
} from '@/lib/validations/category';
import {
  ok,
  err,
  type ServerActionResult,
} from '@/lib/types/server-action';
import { ERROR_CODES } from '@/lib/constants/error-codes';

function firstIssue(issues: { message: string; path: (string | number)[] }[]) {
  const issue = issues[0];
  if (!issue) return { message: 'Dữ liệu không hợp lệ', field: undefined };
  return {
    message: issue.message,
    field: issue.path[0]?.toString(),
  };
}

async function collectDescendantIds(rootId: string): Promise<string[]> {
  const result: string[] = [];
  let frontier: string[] = [rootId];
  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    if (childIds.length === 0) break;
    result.push(...childIds);
    frontier = childIds;
  }
  return result;
}

export async function createCategory(
  input: CategoryInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const existing = await prisma.category.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existing) {
    return err(ERROR_CODES.CONFLICT, 'Slug đã tồn tại, vui lòng chọn slug khác', 'slug');
  }

  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { id: true },
    });
    if (!parent) {
      return err(ERROR_CODES.VALIDATION, 'Danh mục cha không tồn tại', 'parentId');
    }
  }

  const created = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      parentId: data.parentId,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
    },
    select: { id: true },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/');
  return ok({ id: created.id });
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  if (!id) {
    return err(ERROR_CODES.VALIDATION, 'Thiếu mã danh mục');
  }

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const current = await prisma.category.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) {
    return err(ERROR_CODES.NOT_FOUND, 'Không tìm thấy danh mục');
  }

  if (data.slug !== undefined) {
    const slugOwner = await prisma.category.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (slugOwner && slugOwner.id !== id) {
      return err(
        ERROR_CODES.CONFLICT,
        'Slug đã tồn tại, vui lòng chọn slug khác',
        'slug',
      );
    }
  }

  if (data.parentId !== undefined && data.parentId !== null) {
    if (data.parentId === id) {
      return err(
        ERROR_CODES.VALIDATION,
        'Không thể chọn chính danh mục làm danh mục cha',
        'parentId',
      );
    }
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { id: true },
    });
    if (!parent) {
      return err(ERROR_CODES.VALIDATION, 'Danh mục cha không tồn tại', 'parentId');
    }

    const descendantIds = await collectDescendantIds(id);
    if (descendantIds.includes(data.parentId)) {
      return err(
        ERROR_CODES.VALIDATION,
        'Không thể chọn danh mục con làm danh mục cha',
        'parentId',
      );
    }
  }

  await prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.parentId !== undefined && { parentId: data.parentId }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  revalidatePath('/admin/categories');
  revalidatePath(`/admin/categories/${id}/edit`);
  revalidatePath('/');
  return ok({ id });
}

export async function deleteCategory(
  id: string,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  if (!id) {
    return err(ERROR_CODES.VALIDATION, 'Thiếu mã danh mục');
  }

  const current = await prisma.category.findUnique({
    where: { id },
    select: { id: true, _count: { select: { children: true } } },
  });
  if (!current) {
    return err(ERROR_CODES.NOT_FOUND, 'Không tìm thấy danh mục');
  }

  if (current._count.children > 0) {
    return err(
      ERROR_CODES.CONFLICT,
      'Không thể xoá danh mục có danh mục con. Hãy xoá hoặc chuyển danh mục con trước.',
    );
  }

  const descendantIds = await collectDescendantIds(id);
  const productCount = await prisma.product.count({
    where: { categoryId: { in: [id, ...descendantIds] } },
  });

  if (productCount > 0) {
    return err(
      ERROR_CODES.CONFLICT,
      'Không thể xoá danh mục có sản phẩm. Hãy lưu trữ sản phẩm hoặc chuyển sang danh mục khác trước.',
    );
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath('/admin/categories');
  revalidatePath('/');
  return ok({ id });
}
