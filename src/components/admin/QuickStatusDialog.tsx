"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
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
import { FormField } from "@/components/ui/form-field";
import { Select, Option } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_STATUS_LABELS,
  STATUS_TRANSITIONS,
} from "@/lib/constants/order-status";
import { updateOrderStatus } from "@/lib/server/admin-orders";

interface QuickStatusDialogProps {
  orderCode: string;
  currentStatus: OrderStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickStatusDialog({
  orderCode,
  currentStatus,
  open,
  onOpenChange,
}: QuickStatusDialogProps) {
  const router = useRouter();
  const allowed = STATUS_TRANSITIONS[currentStatus];
  const [target, setTarget] = React.useState<OrderStatus | "">(
    allowed[0] ?? "",
  );
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setTarget(allowed[0] ?? "");
      setNote("");
    }
  }, [open, allowed]);

  const noTransitions = allowed.length === 0;

  const handleConfirm = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await updateOrderStatus(
        orderCode,
        target as OrderStatus,
        note || undefined,
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        `Đã chuyển sang ${ORDER_STATUS_LABELS[target as OrderStatus]}.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi trạng thái đơn {orderCode}</DialogTitle>
          <DialogDescription>
            Trạng thái hiện tại:{" "}
            <span className="font-medium text-ink-900">
              {ORDER_STATUS_LABELS[currentStatus]}
            </span>
          </DialogDescription>
        </DialogHeader>

        {noTransitions ? (
          <p className="text-sm text-ink-500">
            Đơn ở trạng thái cuối — không thể chuyển tiếp.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            <FormField label="Chuyển sang">
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value as OrderStatus)}
                aria-label="Trạng thái mới"
              >
                {allowed.map((status) => (
                  <Option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </Option>
                ))}
              </Select>
            </FormField>

            <FormField label="Ghi chú nội bộ (tuỳ chọn)">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Lý do, ghi chú cho team..."
              />
            </FormField>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Huỷ
          </Button>
          <Button
            onClick={handleConfirm}
            loading={pending}
            disabled={noTransitions || !target}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
