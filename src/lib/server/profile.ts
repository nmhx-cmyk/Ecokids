"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server/user-actions";
import { createClient } from "@/lib/supabase/server";
import {
  err,
  ok,
  type ServerActionResult,
} from "@/lib/types/server-action";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function updateProfile(input: {
  name: string;
  phone: string | null;
}): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    name: input.name,
    phone: input.phone ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  const name = parsed.data.name.trim();
  const phone = parsed.data.phone?.trim() ? parsed.data.phone.trim() : null;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name, phone },
    });
  } catch {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể cập nhật thông tin. Vui lòng thử lại.",
    );
  }

  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { name } });

  revalidatePath("/", "layout");
  return ok(null);
}

const avatarSchema = z
  .string()
  .url("URL ảnh đại diện không hợp lệ")
  .nullable();

export async function updateAvatar(
  avatarUrl: string | null,
): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  const parsed = avatarSchema.safeParse(avatarUrl);
  if (!parsed.success) {
    return err(
      ERROR_CODES.VALIDATION,
      parsed.error.issues[0]?.message ?? "URL ảnh đại diện không hợp lệ",
      "avatarUrl",
    );
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: parsed.data },
    });
  } catch {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
    );
  }

  revalidatePath("/account");
  return ok(null);
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
    confirmNewPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): Promise<ServerActionResult<null>> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  if (!user.email) {
    return err(
      ERROR_CODES.VALIDATION,
      "Tài khoản chưa có email. Không thể đổi mật khẩu.",
    );
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return err(ERROR_CODES.UNAUTHORIZED, "Mật khẩu hiện tại không đúng");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể đổi mật khẩu. Vui lòng thử lại.",
    );
  }

  return ok(null);
}
