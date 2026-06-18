"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import {
  ok,
  err,
  type ServerActionResult,
} from "@/lib/types/server-action";
import { ERROR_CODES } from "@/lib/constants/error-codes";
import { rateLimit } from "@/lib/rate-limit";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ServerActionResult<{ userId: string }>> {
  const rl = await rateLimit(`login:${input.email.toLowerCase()}`, 5, 60);
  if (!rl.success) {
    return err(
      ERROR_CODES.CONFLICT,
      "Bạn thử quá nhiều lần. Vui lòng đợi một phút.",
    );
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return err(
      ERROR_CODES.UNAUTHORIZED,
      "Email hoặc mật khẩu không đúng",
    );
  }

  revalidatePath("/", "layout");
  return ok({ userId: data.user.id });
}

export async function registerAction(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ServerActionResult<{ userId: string }>> {
  const rl = await rateLimit(`register:${input.email.toLowerCase()}`, 3, 3600);
  if (!rl.success) {
    return err(
      ERROR_CODES.CONFLICT,
      "Bạn thử quá nhiều lần. Vui lòng đợi một phút.",
    );
  }

  if (input.password !== input.confirmPassword) {
    return err(
      ERROR_CODES.VALIDATION,
      "Mật khẩu xác nhận không khớp",
      "confirmPassword",
    );
  }

  const parsed = registerSchema.safeParse({
    name: input.name,
    email: input.email,
    password: input.password,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error || !data.user) {
    const message = error?.message?.includes("already")
      ? "Email đã được đăng ký"
      : "Không thể tạo tài khoản. Vui lòng thử lại.";
    const code = error?.message?.includes("already")
      ? ERROR_CODES.CONFLICT
      : ERROR_CODES.INTERNAL;
    return err(code, message);
  }

  revalidatePath("/", "layout");
  return ok({ userId: data.user.id });
}

export async function signOutAction(): Promise<ServerActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return err(ERROR_CODES.INTERNAL, "Không thể đăng xuất. Vui lòng thử lại.");
  }
  revalidatePath("/", "layout");
  return ok(null);
}

// Form-action wrapper — `<form action={...}>` requires `(formData: FormData) => void | Promise<void>`.
export async function signOutFormAction(_formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function forgotPasswordAction(input: {
  email: string;
}): Promise<ServerActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/reset-password`,
  });

  if (error) {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể gửi email khôi phục. Vui lòng thử lại.",
    );
  }

  return ok(null);
}

export async function resetPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<ServerActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return err(
      ERROR_CODES.VALIDATION,
      issue?.message ?? "Dữ liệu không hợp lệ",
      issue?.path[0]?.toString(),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.",
    );
  }

  revalidatePath("/", "layout");
  return ok(null);
}

export async function signInWithGoogleAction(): Promise<
  ServerActionResult<{ url: string }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${APP_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return err(
      ERROR_CODES.INTERNAL,
      "Không thể đăng nhập với Google. Vui lòng thử lại.",
    );
  }

  return ok({ url: data.url });
}
