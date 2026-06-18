import { NextResponse } from "next/server";

import { ERROR_CODES } from "@/lib/constants/error-codes";
import { getCurrentUser } from "@/lib/server/user-actions";
import {
  ALLOWED_BUCKETS,
  uploadImage,
  type AllowedBucket,
} from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: ERROR_CODES.UNAUTHORIZED, message: "Vui lòng đăng nhập" } },
      { status: 401 },
    );
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: ERROR_CODES.VALIDATION, message: "Dữ liệu không hợp lệ" } },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  const bucketEntry = formData.get("bucket");
  const pathPrefixEntry = formData.get("pathPrefix");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { ok: false, error: { code: ERROR_CODES.VALIDATION, message: "Thiếu tệp tải lên", field: "file" } },
      { status: 400 },
    );
  }
  if (typeof bucketEntry !== "string" || !isAllowedBucket(bucketEntry)) {
    return NextResponse.json(
      { ok: false, error: { code: ERROR_CODES.VALIDATION, message: "Bucket không hợp lệ", field: "bucket" } },
      { status: 400 },
    );
  }

  const pathPrefix =
    typeof pathPrefixEntry === "string" && pathPrefixEntry.length > 0
      ? pathPrefixEntry
      : undefined;

  // Non-admin users may only upload avatars into their own user-id prefix.
  if (user.role !== "ADMIN") {
    if (bucketEntry !== "avatars") {
      return NextResponse.json(
        { ok: false, error: { code: ERROR_CODES.FORBIDDEN, message: "Bạn không có quyền tải ảnh" } },
        { status: 403 },
      );
    }
    const normalized = pathPrefix?.replace(/^\/+|\/+$/g, "") ?? "";
    if (normalized !== user.id) {
      return NextResponse.json(
        { ok: false, error: { code: ERROR_CODES.FORBIDDEN, message: "Đường dẫn tải ảnh không hợp lệ" } },
        { status: 403 },
      );
    }
  }

  try {
    const result = await uploadImage({
      bucket: bucketEntry,
      pathPrefix,
      file: fileEntry,
      contentType: fileEntry.type || undefined,
    });
    return NextResponse.json({ ok: true, url: result.url, path: result.path });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tải ảnh thất bại";
    const isSizeError = message.includes("2MB") || message.includes("trống");
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: isSizeError ? ERROR_CODES.VALIDATION : ERROR_CODES.INTERNAL,
          message,
        },
      },
      { status: isSizeError ? 400 : 500 },
    );
  }
}
