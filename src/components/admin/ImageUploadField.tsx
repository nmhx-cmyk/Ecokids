'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils/cn';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  pathPrefix: string;
  label?: string;
  aspectRatio?: number;
  disabled?: boolean;
}

export function ImageUploadField({
  value,
  onChange,
  bucket,
  pathPrefix,
  label = 'Hình ảnh',
  aspectRatio = 4 / 5,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Kích thước ảnh tối đa 2MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('pathPrefix', pathPrefix);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || 'Tải ảnh thất bại');
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error('Phản hồi tải ảnh không hợp lệ');
      }

      onChange(data.url);
      toast.success('Tải ảnh thành công');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tải ảnh thất bại';
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <div
        className={cn(
          'relative w-full max-w-xs overflow-hidden rounded-lg border border-dashed border-ink-200 bg-cream-50',
          disabled && 'opacity-60',
        )}
        style={{ aspectRatio: String(aspectRatio) }}
      >
        {value ? (
          <Image
            src={value}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-500 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Bấm để chọn ảnh</span>
            <span className="text-[11px] text-ink-500">JPG / PNG / WebP, ≤ 2MB</span>
          </button>
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
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            Đổi ảnh
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xoá
          </Button>
        </div>
      ) : null}
    </div>
  );
}
