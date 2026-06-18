"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AvatarUpload } from "@/components/account/AvatarUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { updateAvatar, updateProfile } from "@/lib/server/profile";

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, "Tên tối thiểu 2 ký tự")
    .max(100, "Tên tối đa 100 ký tự"),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^(0|\+84)[0-9]{9}$/.test(v),
      "Số điện thoại không hợp lệ",
    ),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  initial: {
    userId: string;
    name: string | null;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
}

function getInitials(name: string | null, email: string): string {
  const source = (name ?? "").trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [avatarPending, startAvatarTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initial.name ?? "",
      phone: initial.phone ?? "",
    },
  });

  const initials = getInitials(initial.name, initial.email);

  const handleAvatarChange = (next: string | null) => {
    const previous = avatarUrl;
    setAvatarUrl(next);
    startAvatarTransition(async () => {
      const result = await updateAvatar(next);
      if (!result.ok) {
        setAvatarUrl(previous);
        toast.error(result.error.message);
        return;
      }
      toast.success(next ? "Đã cập nhật ảnh đại diện" : "Đã xoá ảnh đại diện");
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    const phone = values.phone.trim();
    const result = await updateProfile({
      name: values.name.trim(),
      phone: phone === "" ? null : phone,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Đã cập nhật thông tin tài khoản");
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <AvatarUpload
            value={avatarUrl}
            onChange={handleAvatarChange}
            fallback={initials}
            userId={initial.userId}
            disabled={avatarPending}
          />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Họ và tên"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              autoComplete="name"
              {...register("name")}
              error={Boolean(errors.name)}
              placeholder="Nguyễn Văn A"
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="email"
            hint="Email không thể thay đổi"
          >
            <Input
              id="email"
              type="email"
              value={initial.email}
              readOnly
              className="bg-cream-50"
            />
          </FormField>

          <FormField
            label="Số điện thoại"
            htmlFor="phone"
            error={errors.phone?.message}
            hint="Định dạng 0xxxxxxxxx hoặc +84xxxxxxxxx"
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register("phone")}
              error={Boolean(errors.phone)}
              placeholder="0901234567"
            />
          </FormField>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
