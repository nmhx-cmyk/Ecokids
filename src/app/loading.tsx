import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 py-16"
    >
      <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden="true" />
      <p className="text-sm text-ink-500">Đang tải...</p>
    </div>
  );
}
