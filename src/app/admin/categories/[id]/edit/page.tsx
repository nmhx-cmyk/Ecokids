import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CategoryForm } from '@/components/admin/CategoryForm';
import { Button } from '@/components/ui/button';
import {
  getCategoryById,
  listCategoriesFlat,
} from '@/lib/queries/categories';

export const metadata = {
  title: 'Sửa danh mục',
};

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const [category, categories] = await Promise.all([
    getCategoryById(params.id),
    listCategoriesFlat(),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-ink-500"
        >
          <Link href="/admin/categories">← Quay lại danh sách</Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            Sửa danh mục: {category.name}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Đang có {category.productCount} sản phẩm trong danh mục này.
          </p>
        </div>
      </header>

      <CategoryForm
        mode="edit"
        currentId={category.id}
        initialData={{
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
        }}
        allCategories={categories}
      />
    </div>
  );
}
