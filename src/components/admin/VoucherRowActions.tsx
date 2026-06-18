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
import { deleteVoucher } from '@/lib/server/vouchers';

export interface VoucherRowActionsProps {
  voucher: {
    id: string;
    code: string;
  };
}

export function VoucherRowActions({ voucher }: VoucherRowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteVoucher(voucher.id);
      if (result.ok) {
        toast.success(`Đã xoá mã "${voucher.code}"`);
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
            aria-label={`Mở menu cho ${voucher.code}`}
          >
            <MoreVertical className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/vouchers/${voucher.id}/edit`}>
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
            <DialogTitle>Xoá mã giảm giá</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá mã{' '}
              <span className="font-medium text-ink-900">{voucher.code}</span>?
              Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
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
              Xoá mã giảm giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
