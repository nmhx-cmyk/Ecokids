"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@/components/ui";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/server/auth-actions";

export default function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    const result = await forgotPasswordAction(values);
    if (!result.ok) {
      setError("root", { message: result.error.message });
      toast.error(result.error.message);
      return;
    }
    setSentEmail(values.email);
    toast.success("Đã gửi email khôi phục");
  };

  if (sentEmail) {
    return (
      <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
        <CardHeader className="space-y-1.5 p-6 sm:p-8 sm:pb-4">
          <CardTitle className="text-2xl font-semibold text-ink-900">
            Kiểm tra email
          </CardTitle>
          <CardDescription className="text-sm text-ink-500">
            Đã gửi email khôi phục đến{" "}
            <span className="font-medium text-ink-700">{sentEmail}</span>. Vui
            lòng kiểm tra hộp thư và làm theo hướng dẫn.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-coral-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại đăng nhập
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full rounded-2xl border-ink-200 bg-white shadow-md">
      <CardHeader className="space-y-1.5 p-6 sm:p-8 sm:pb-4">
        <CardTitle className="text-2xl font-semibold text-ink-900">
          Quên mật khẩu
        </CardTitle>
        <CardDescription className="text-sm text-ink-500">
          Nhập email để nhận liên kết khôi phục
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
            Gửi liên kết khôi phục
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-coral-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại đăng nhập
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
