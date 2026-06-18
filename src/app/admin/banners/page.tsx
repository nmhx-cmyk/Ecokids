import Link from "next/link";
import { ImageIcon } from "lucide-react";

import { BannerList } from "@/components/admin/BannerList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBanners } from "@/lib/queries/banners";

export const metadata = { title: "Banner trang chủ" };

export default async function AdminBannersPage() {
  const banners = await getBanners();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Banner trang chủ</h2>
          <p className="mt-1 text-sm text-ink-500">
            Kéo–thả để sắp xếp thứ tự hiển thị trên trang chủ.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/banners/new">+ Thêm banner</Link>
        </Button>
      </header>

      {banners.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ImageIcon className="h-5 w-5" aria-hidden="true" />}
            title="Chưa có banner"
            description="Tạo banner đầu tiên để hiển thị trên trang chủ."
            action={
              <Button asChild>
                <Link href="/admin/banners/new">Tạo banner</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <BannerList
          initial={banners.map((b) => ({
            id: b.id,
            title: b.title,
            imageUrl: b.imageUrl,
            isActive: b.isActive,
          }))}
        />
      )}
    </div>
  );
}
