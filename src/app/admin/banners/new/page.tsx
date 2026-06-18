import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { BannerForm } from "@/components/admin/BannerForm";

export const metadata = { title: "Thêm banner" };

export default function NewBannerPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/admin/banners"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-coral-600"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Tất cả banner
      </Link>
      <h2 className="text-xl font-semibold text-ink-900">Thêm banner</h2>
      <BannerForm />
    </div>
  );
}
