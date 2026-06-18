"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-600">
          <AlertCircle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-ink-900">Có lỗi xảy ra</h1>
        <p className="mt-2 text-sm text-ink-500">
          Đã xảy ra sự cố ngoài ý muốn. Vui lòng thử lại trong giây lát.
        </p>
        <Button className="mt-6" onClick={() => reset()}>
          Thử lại
        </Button>
      </div>
    </main>
  );
}
