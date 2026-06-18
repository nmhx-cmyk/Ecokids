import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategoriesFlat } from "@/lib/queries/categories";

export const metadata = {
  title: "Thêm sản phẩm — Quản trị",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await listCategoriesFlat();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Quay lại">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-ink-900">Thêm sản phẩm</h2>
            <p className="mt-1 text-sm text-ink-500">
              Điền thông tin để tạo sản phẩm mới.
            </p>
          </div>
        </div>
      </header>

      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
