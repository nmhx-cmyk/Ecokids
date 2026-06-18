import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BannerForm } from "@/components/admin/BannerForm";
import { getBannerById } from "@/lib/queries/banners";

export const metadata = { title: "Sửa banner" };

interface PageProps {
  params: { id: string };
}

export default async function EditBannerPage({ params }: PageProps) {
  const banner = await getBannerById(params.id);
  if (!banner) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href="/admin/banners"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-coral-600"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Tất cả banner
      </Link>
      <h2 className="text-xl font-semibold text-ink-900">Sửa banner</h2>
      <BannerForm
        banner={{
          id: banner.id,
          title: banner.title,
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          isActive: banner.isActive,
          sortOrder: banner.sortOrder,
        }}
      />
    </div>
  );
}
