"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  Label,
} from "@/components/ui";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import {
  loginAction,
  signInWithGoogleAction,
} from "@/lib/server/auth-actions";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    const result = await loginAction(values);
    if (!result.ok) {
      setError("root", { message: result.error.message });
      toast.error(result.error.message);
      return;
    }
    toast.success("Đăng nhập thành công");
    router.push(redirectTo);
    router.refresh();
  };

  const onGoogleClick = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogleAction();
    if (!result.ok) {
      toast.error(result.error.message);
      setGoogleLoading(false);
      return;
    }
    window.location.href = result.data.url;
  };

  return (
    <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
      <CardHeader className="space-y-1.5 p-6 sm:p-8 sm:pb-4">
        <CardTitle className="text-2xl font-semibold text-ink-900">
          Đăng nhập
        </CardTitle>
        <CardDescription className="text-sm text-ink-500">
          Chào mừng trở lại Ecokids
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
            required
          >
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                className="pl-9"
                error={!!errors.email}
                {...register("email")}
              />
            </div>
          </FormField>

          <FormField
            label="Mật khẩu"
            htmlFor="password"
            error={errors.password?.message}
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
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm text-ink-700">
                Ghi nhớ đăng nhập
              </Label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-coral-600 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

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
            Đăng nhập
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-ink-500">Hoặc</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          loading={googleLoading}
          onClick={onGoogleClick}
        >
          <GoogleIcon />
          Đăng nhập với Google
        </Button>

        <p className="mt-6 text-center text-sm text-ink-500">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-coral-600 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.24 1.5-1.74 4.4-5.4 4.4-3.24 0-5.88-2.7-5.88-6s2.64-6 5.88-6c1.86 0 3.1.78 3.8 1.46l2.6-2.5C16.66 3.86 14.56 3 12 3 6.96 3 3 6.96 3 12s3.96 9 9 9c5.2 0 8.64-3.64 8.64-8.78 0-.6-.06-1.04-.14-1.5H12z"
      />
    </svg>
  );
}
