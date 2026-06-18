"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { createBanner, updateBanner } from "@/lib/server/banners";

interface BannerFormProps {
  banner?: {
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  };
}

export function BannerForm({ banner }: BannerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(banner);

  const [title, setTitle] = useState(banner?.title ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(banner?.imageUrl ?? null);
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error("Vui lòng tải ảnh banner");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      imageUrl,
      linkUrl: linkUrl.trim() || null,
      sortOrder: banner?.sortOrder ?? 0,
      isActive,
    };
    const result = isEdit
      ? await updateBanner(banner!.id, payload)
      : await createBanner(payload);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(isEdit ? "Đã cập nhật banner" : "Đã tạo banner");
    router.push("/admin/banners");
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            bucket="product-images"
            pathPrefix="banners"
            label="Ảnh banner (khuyến nghị 16:6)"
            aspectRatio={16 / 6}
          />

          <FormField label="Tiêu đề" htmlFor="title" required>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bộ sưu tập hè 2026"
            />
          </FormField>

          <FormField
            label="Đường dẫn khi bấm"
            htmlFor="linkUrl"
            hint="Ví dụ: /products?category=be-trai (không bắt buộc)"
          >
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products"
            />
          </FormField>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <Checkbox
              checked={isActive}
              onCheckedChange={(c) => setIsActive(c === true)}
            />
            Hiển thị banner này
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Huỷ
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Lưu thay đổi" : "Tạo banner"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
