"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Spinner,
} from "@/components/ui";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/server/auth-actions";
import { createClient } from "@/lib/supabase/client";

type TokenStatus = "checking" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("checking");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (error) {
            setTokenStatus("invalid");
            return;
          }
          setTokenStatus("valid");
          // Clear the hash so the token isn't visible.
          window.history.replaceState(null, "", window.location.pathname);
        });
      return;
    }

    // If no recovery token in the hash, check if we already have a session
    // (e.g. user landed here from another tab after exchanging the token).
    supabase.auth.getSession().then(({ data }) => {
      setTokenStatus(data.session ? "valid" : "invalid");
    });
  }, []);

  const onSubmit = async (values: ResetPasswordInput) => {
    const result = await resetPasswordAction(values);
    if (!result.ok) {
      setError("root", { message: result.error.message });
      toast.error(result.error.message);
      return;
    }
    toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    router.push("/login");
  };

  if (tokenStatus === "checking") {
    return (
      <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
        <CardContent className="flex items-center justify-center p-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
        <CardHeader className="space-y-1.5 p-6 sm:p-8 sm:pb-4">
          <CardTitle className="text-2xl font-semibold text-ink-900">
            Liên kết không hợp lệ
          </CardTitle>
          <CardDescription className="text-sm text-ink-500">
            Liên kết khôi phục có thể đã hết hạn hoặc không đúng. Vui lòng yêu
            cầu liên kết mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
          <Link href="/forgot-password">
            <Button className="w-full" size="lg">
              Gửi lại liên kết
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
      <CardHeader className="space-y-1.5 p-6 sm:p-8 sm:pb-4">
        <CardTitle className="text-2xl font-semibold text-ink-900">
          Đặt lại mật khẩu
        </CardTitle>
        <CardDescription className="text-sm text-ink-500">
          Tạo mật khẩu mới cho tài khoản
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="Mật khẩu mới"
            htmlFor="password"
            error={errors.password?.message}
            hint="Tối thiểu 8 ký tự"
            required
          >
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                aria-hidden="true"
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Tạo mật khẩu mới"
                className="pl-9 pr-9"
                error={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-500 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </FormField>

          <FormField
            label="Xác nhận mật khẩu"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                aria-hidden="true"
              />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                className="pl-9"
                error={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
            </div>
          </FormField>

          {errors.root?.message ? (
            <p className="text-sm text-danger" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isSubmitting}
          >
            Đặt lại mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
