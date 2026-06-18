"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { deleteProduct } from "@/lib/server/products";

interface ProductTableRowActionsProps {
  productId: string;
  productSlug: string;
  productName: string;
}

export function ProductTableRowActions({
  productId,
  productSlug,
  productName,
}: ProductTableRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.archived) {
        toast.success("Sản phẩm có đơn hàng — đã chuyển sang trạng thái Lưu trữ.");
      } else {
        toast.success("Đã xoá sản phẩm.");
      }
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mở menu hành động">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${productId}/edit`}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Sửa
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/products/${productSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Xem trên web
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá sản phẩm?</DialogTitle>
            <DialogDescription>
              Bạn sắp xoá “{productName}”. Nếu sản phẩm có đơn hàng liên quan,
              hệ thống sẽ chuyển sang trạng thái Lưu trữ thay vì xoá hẳn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={pending}>
              Xoá sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
