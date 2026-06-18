import Link from "next/link";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100 text-ink-500">
          <FileSearch className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-ink-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-ink-500">
          Trang bạn tìm có thể đã được di chuyển hoặc không còn tồn tại.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
