"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormField,
  Textarea,
} from "@/components/ui";
import { cancelOrder } from "@/lib/server/orders";

interface CancelOrderDialogProps {
  orderCode: string;
}

export function CancelOrderDialog({ orderCode }: CancelOrderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await cancelOrder(orderCode);
      if (result.ok) {
        toast.success("Đã huỷ đơn hàng");
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="danger" className="w-full">
          Huỷ đơn hàng
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Huỷ đơn hàng?</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn huỷ đơn hàng{" "}
            <span className="font-mono text-ink-900">{orderCode}</span>? Hành
            động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <FormField
            htmlFor="cancel-reason"
            label="Lý do (không bắt buộc)"
          >
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Chia sẻ lý do giúp chúng tôi cải thiện dịch vụ"
              rows={3}
              disabled={pending}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Quay lại
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            loading={pending}
          >
            Xác nhận huỷ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
