"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ReturnStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { requestReturn } from "@/lib/server/returns";

interface ExistingReturn {
  status: ReturnStatus;
  reason: string;
  adminNote: string | null;
}

interface ReturnRequestSectionProps {
  orderCode: string;
  isCompleted: boolean;
  existingReturn: ExistingReturn | null;
}

const STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: "Đang chờ xử lý",
  APPROVED: "Đã duyệt — chờ hoàn tiền",
  REJECTED: "Bị từ chối",
  REFUNDED: "Đã hoàn tiền",
};

const STATUS_VARIANT: Record<
  ReturnStatus,
  "warning" | "coral" | "danger" | "mint"
> = {
  REQUESTED: "warning",
  APPROVED: "coral",
  REJECTED: "danger",
  REFUNDED: "mint",
};

export function ReturnRequestSection({
  orderCode,
  isCompleted,
  existingReturn,
}: ReturnRequestSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isCompleted && !existingReturn) return null;

  if (existingReturn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu trả hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant={STATUS_VARIANT[existingReturn.status]}>
            {STATUS_LABEL[existingReturn.status]}
          </Badge>
          <p className="whitespace-pre-wrap text-sm text-ink-700">
            <span className="text-ink-500">Lý do: </span>
            {existingReturn.reason}
          </p>
          {existingReturn.adminNote ? (
            <p className="rounded-lg bg-cream-50 px-3 py-2 text-sm text-ink-700">
              <span className="text-ink-500">Phản hồi từ shop: </span>
              {existingReturn.adminNote}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    setSaving(true);
    const result = await requestReturn({ orderCode, reason: reason.trim() });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Đã gửi yêu cầu trả hàng");
    setOpen(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trả hàng / hoàn tiền</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-ink-700">
          Đơn đã hoàn thành. Nếu sản phẩm có vấn đề, bạn có thể gửi yêu cầu trả hàng.
        </p>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Yêu cầu trả hàng
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yêu cầu trả hàng — {orderCode}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mô tả lý do trả hàng (tối thiểu 10 ký tự)..."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Huỷ
            </Button>
            <Button type="button" onClick={submit} loading={saving}>
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
