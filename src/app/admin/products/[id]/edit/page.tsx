import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/ProductForm";
import { listCategoriesFlat } from "@/lib/queries/categories";
import { getAdminProductById } from "@/lib/queries/products";

export const metadata = {
  title: "Sửa sản phẩm — Quản trị",
};

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: { id: string };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [product, categories] = await Promise.all([
    getAdminProductById(params.id),
    listCategoriesFlat(),
  ]);

  if (!product) {
    notFound();
  }

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
            <h2 className="text-xl font-semibold text-ink-900">
              Sửa sản phẩm
            </h2>
            <p className="mt-1 text-sm text-ink-500">{product.name}</p>
          </div>
        </div>
      </header>

      <ProductForm
        mode="edit"
        initialData={product}
        categories={categories}
      />
    </div>
  );
}
