import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";

import { ProductGrid } from "@/components/storefront/ProductGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getWishlist } from "@/lib/queries/wishlist";
import { requireUser } from "@/lib/server/user-actions";

export const metadata: Metadata = {
  title: "Sản phẩm yêu thích",
};

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const products = await getWishlist(user.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">Sản phẩm yêu thích</h2>
        <p className="mt-1 text-sm text-ink-500">
          Những sản phẩm bạn đã lưu lại để mua sau.
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" strokeWidth={1.5} />}
          title="Chưa có sản phẩm yêu thích"
          description="Nhấn vào biểu tượng trái tim trên sản phẩm để lưu vào đây."
          action={
            <Button asChild>
              <Link href="/products">Khám phá sản phẩm</Link>
            </Button>
          }
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
