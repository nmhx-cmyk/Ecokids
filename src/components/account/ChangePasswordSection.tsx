"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/server/profile";
import { cn } from "@/lib/utils/cn";

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
    confirmNewPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

type PasswordFieldName =
  | "currentPassword"
  | "newPassword"
  | "confirmNewPassword";

export function ChangePasswordSection() {
  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const toggle = (field: PasswordFieldName) =>
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  const onSubmit = handleSubmit(async (values) => {
    const result = await changePassword(values);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    reset();
    toast.success("Đổi mật khẩu thành công");
  });

  const renderField = (
    field: PasswordFieldName,
    label: string,
    autoComplete: string,
  ) => {
    const id = `pw-${field}`;
    const isVisible = visible[field];
    const error = errors[field]?.message;
    return (
      <FormField label={label} htmlFor={id} required error={error}>
        <div className="relative">
          <Input
            id={id}
            type={isVisible ? "text" : "password"}
            autoComplete={autoComplete}
            {...register(field)}
            error={Boolean(error)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => toggle(field)}
            aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-500 transition-colors hover:text-ink-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
            )}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </FormField>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" aria-hidden="true" />
          Đổi mật khẩu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {renderField("currentPassword", "Mật khẩu hiện tại", "current-password")}
          {renderField("newPassword", "Mật khẩu mới", "new-password")}
          {renderField(
            "confirmNewPassword",
            "Xác nhận mật khẩu mới",
            "new-password",
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
