import "server-only";

import { createClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slug";

export const BUCKET_PRODUCT_IMAGES = "product-images";
export const BUCKET_CATEGORY_IMAGES = "category-images";
export const BUCKET_AVATARS = "avatars";

export const ALLOWED_BUCKETS = [
  BUCKET_PRODUCT_IMAGES,
  BUCKET_CATEGORY_IMAGES,
  BUCKET_AVATARS,
] as const;

export type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_BY_MIME: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
};

function extFromContentType(contentType: string | undefined): string {
  if (!contentType) return "webp";
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return EXT_BY_MIME[normalized] ?? "webp";
}

function randomSuffix(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

function buildObjectPath(
  pathPrefix: string | undefined,
  fileName: string,
  ext: string,
): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const slug = slugify(base) || "file";
  const suffix = randomSuffix(8);
  const finalName = `${slug}-${suffix}.${ext}`;
  const prefix = pathPrefix
    ? pathPrefix.replace(/^\/+|\/+$/g, "")
    : "";
  return prefix ? `${prefix}/${finalName}` : finalName;
}

export async function uploadImage(opts: {
  bucket: string;
  pathPrefix?: string;
  file: File;
  contentType?: string;
}): Promise<{ url: string; path: string }> {
  const { bucket, pathPrefix, file } = opts;
  const contentType = opts.contentType ?? file.type ?? "image/webp";

  if (file.size <= 0) {
    throw new Error("Tệp tải lên trống");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Kích thước tệp vượt quá 2MB");
  }

  const ext = extFromContentType(contentType);
  const objectPath = buildObjectPath(pathPrefix, file.name || "image", ext);

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, { contentType, upsert: false });

  if (error) {
    throw new Error(`Tải ảnh thất bại: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error("Không thể lấy URL công khai cho ảnh đã tải lên");
  }

  return { url: data.publicUrl, path: objectPath };
}

export async function deleteImage(opts: {
  bucket: string;
  path: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(opts.bucket).remove([opts.path]);
  if (error) {
    throw new Error(`Xoá ảnh thất bại: ${error.message}`);
  }
}

export async function deleteImageByUrl(url: string): Promise<void> {
  // Expected format:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) {
    throw new Error("URL ảnh không hợp lệ");
  }
  const tail = url.slice(idx + marker.length);
  const slash = tail.indexOf("/");
  if (slash === -1) {
    throw new Error("URL ảnh không hợp lệ");
  }
  const bucket = tail.slice(0, slash);
  const path = decodeURIComponent(tail.slice(slash + 1));
  if (!bucket || !path) {
    throw new Error("URL ảnh không hợp lệ");
  }
  await deleteImage({ bucket, path });
}
