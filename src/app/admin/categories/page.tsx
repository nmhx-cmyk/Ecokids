import Image from 'next/image';
import Link from 'next/link';
import { Fragment } from 'react';
import { FolderTree, Pencil } from 'lucide-react';

import { CategoryRowActions } from '@/components/admin/CategoryRowActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getCategoryTree,
  type CategoryTreeNode,
} from '@/lib/queries/categories';
import { cn } from '@/lib/utils/cn';

export const metadata = {
  title: 'Danh mục',
};

function CategoryRow({
  node,
  depth,
}: {
  node: CategoryTreeNode;
  depth: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-ink-200 px-4 py-3 first:border-t-0',
      )}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-3"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cream-100">
          {node.imageUrl ? (
            <Image
              src={node.imageUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-500">
              <FolderTree className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900">
            {node.name}
          </p>
          <p className="truncate font-mono text-xs text-ink-500">{node.slug}</p>
        </div>
      </div>
      <div className="hidden w-24 text-sm text-ink-700 sm:block">
        {node.productCount} SP
      </div>
      <div className="hidden w-16 text-sm text-ink-700 md:block">
        {node.sortOrder}
      </div>
      <div className="flex w-auto items-center justify-end gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/admin/categories/${node.id}/edit`}
            aria-label={`Sửa ${node.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sửa</span>
          </Link>
        </Button>
        <CategoryRowActions
          category={{
            id: node.id,
            name: node.name,
            productCount: node.productCount,
            childrenCount: node.children.length,
          }}
        />
      </div>
    </div>
  );
}

function renderTree(nodes: CategoryTreeNode[], depth: number): React.ReactNode {
  return nodes.map((node) => (
    <Fragment key={node.id}>
      <CategoryRow node={node} depth={depth} />
      {node.children.length > 0 ? renderTree(node.children, depth + 1) : null}
    </Fragment>
  ));
}

export default async function AdminCategoriesPage() {
  const tree = await getCategoryTree();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Danh mục</h2>
          <p className="mt-1 text-sm text-ink-500">
            Quản lý cây danh mục sản phẩm. Có thể tạo danh mục con bằng cách
            chọn danh mục cha.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">+ Thêm danh mục</Link>
        </Button>
      </header>

      {tree.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderTree className="h-5 w-5" aria-hidden="true" />}
            title="Chưa có danh mục nào"
            description="Tạo danh mục đầu tiên để bắt đầu sắp xếp sản phẩm theo nhóm."
            action={
              <Button asChild>
                <Link href="/admin/categories/new">Tạo danh mục đầu tiên</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-3 border-b border-ink-200 bg-cream-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500 sm:flex">
            <div className="min-w-0 flex-1">Tên / Slug</div>
            <div className="w-24">Số sản phẩm</div>
            <div className="hidden w-16 md:block">Sắp xếp</div>
            <div className="w-32 text-right">Hành động</div>
          </div>
          <div>{renderTree(tree, 0)}</div>
        </Card>
      )}
    </div>
  );
}
