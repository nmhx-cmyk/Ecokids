"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/user-actions";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import {
  bannerSchema,
  reorderBannersSchema,
  type BannerInput,
} from "@/lib/validations/banner";

function firstIssue(issues: { message: string; path: (string | number)[] }[]) {
  const issue = issues[0];
  return {
    message: issue?.message ?? "Dữ liệu không hợp lệ",
    field: issue?.path[0]?.toString(),
  };
}

export async function createBanner(
  input: BannerInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  // New banners go to the end by default.
  const max = await prisma.banner.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.banner.create({
    data: {
      title: data.title,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      isActive: data.isActive,
      sortOrder: data.sortOrder || (max._max.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidateTag("banners");
  return ok({ id: created.id });
}

export async function updateBanner(
  id: string,
  input: BannerInput,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã banner");

  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = firstIssue(parsed.error.issues);
    return err(ERROR_CODES.VALIDATION, message, field);
  }
  const data = parsed.data;

  const current = await prisma.banner.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy banner");

  await prisma.banner.update({
    where: { id },
    data: {
      title: data.title,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidateTag("banners");
  return ok({ id });
}

export async function deleteBanner(
  id: string,
): Promise<ServerActionResult<{ id: string }>> {
  await requireAdmin();
  if (!id) return err(ERROR_CODES.VALIDATION, "Thiếu mã banner");

  try {
    await prisma.banner.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return err(ERROR_CODES.NOT_FOUND, "Không tìm thấy banner");
    }
    throw error;
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidateTag("banners");
  return ok({ id });
}

/** Persists a new banner order (array of ids in display order). */
export async function reorderBanners(
  ids: string[],
): Promise<ServerActionResult<null>> {
  await requireAdmin();

  const parsed = reorderBannersSchema.safeParse({ ids });
  if (!parsed.success) {
    return err(ERROR_CODES.VALIDATION, "Danh sách thứ tự không hợp lệ");
  }

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.banner.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath("/admin/banners");
  revalidatePath("/");
  revalidateTag("banners");
  return ok(null);
}
