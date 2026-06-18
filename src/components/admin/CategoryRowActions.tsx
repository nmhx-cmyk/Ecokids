'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { deleteCategory } from '@/lib/server/categories';

export interface CategoryRowActionsProps {
  category: {
    id: string;
    name: string;
    productCount: number;
    childrenCount: number;
  };
}

export function CategoryRowActions({ category }: CategoryRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        toast.success(`Đã xoá danh mục "${category.name}"`);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Mở menu cho ${category.name}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/categories/${category.id}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Sửa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
            className="text-danger focus:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá danh mục</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá danh mục{' '}
              <span className="font-medium text-ink-900">{category.name}</span>?
              Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          {category.productCount > 0 || category.childrenCount > 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-warning">
              Danh mục đang có {category.childrenCount} danh mục con và{' '}
              {category.productCount} sản phẩm. Cần chuyển/xoá trước khi xoá
              danh mục này.
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              loading={isPending}
            >
              Xoá danh mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
