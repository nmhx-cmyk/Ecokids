import Link from 'next/link';

import { CategoryForm } from '@/components/admin/CategoryForm';
import { Button } from '@/components/ui/button';
import { listCategoriesFlat } from '@/lib/queries/categories';

export const metadata = {
  title: 'Thêm danh mục',
};

export default async function NewCategoryPage() {
  const categories = await listCategoriesFlat();

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
          <h2 className="text-xl font-semibold text-ink-900">Thêm danh mục</h2>
          <p className="mt-1 text-sm text-ink-500">
            Tạo danh mục mới và sắp xếp vị trí hiển thị.
          </p>
        </div>
      </header>

      <CategoryForm mode="create" allCategories={categories} />
    </div>
  );
}
