"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/cn";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  fallback: string;
  userId: string;
  disabled?: boolean;
}

export function AvatarUpload({
  value,
  onChange,
  fallback,
  userId,
  disabled = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Kích thước ảnh tối đa 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "avatars");
      formData.append("pathPrefix", userId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "Tải ảnh thất bại");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Phản hồi tải ảnh không hợp lệ");
      }

      onChange(data.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tải ảnh thất bại";
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-ink-200 bg-cream-100",
          disabled && "opacity-60",
        )}
      >
        {value ? (
          <Image
            src={value}
            alt="Ảnh đại diện"
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-xl font-semibold text-ink-700"
            aria-hidden="true"
          >
            {fallback}
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner className="h-6 w-6" />
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Đổi ảnh
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xoá ảnh
          </Button>
        ) : null}
      </div>
    </div>
  );
}
