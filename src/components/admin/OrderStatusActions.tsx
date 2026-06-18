"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Package,
  Truck,
  X,
} from "lucide-react";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/constants/order-status";
import {
  updateOrderStatus,
  updatePaymentStatus,
} from "@/lib/server/admin-orders";
import { formatDate } from "@/lib/utils/format";

interface OrderStatusActionsProps {
  order: {
    orderCode: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paidAt: Date | null;
  };
}

const STATUS_BADGE: Record<
  OrderStatus,
  "default" | "coral" | "mint" | "warning" | "danger" | "ink"
> = {
  PENDING: "warning",
  CONFIRMED: "coral",
  PACKING: "default",
  SHIPPING: "ink",
  COMPLETED: "mint",
  CANCELED: "danger",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
};

const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  "default" | "mint" | "warning" | "danger"
> = {
  UNPAID: "warning",
  PAID: "mint",
  REFUNDED: "danger",
};

export function OrderStatusActions({ order }: OrderStatusActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelNote, setCancelNote] = React.useState("");

  const advanceStatus = (next: OrderStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.orderCode, next);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Đã chuyển sang ${ORDER_STATUS_LABELS[next]}.`);
      router.refresh();
    });
  };

  const confirmCancel = () => {
    startTransition(async () => {
      const result = await updateOrderStatus(
        order.orderCode,
        OrderStatus.CANCELED,
        cancelNote || undefined,
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Đã huỷ đơn và hoàn lại tồn kho.");
      setCancelOpen(false);
      setCancelNote("");
      router.refresh();
    });
  };

  const changePayment = (next: PaymentStatus) => {
    startTransition(async () => {
      const result = await updatePaymentStatus(order.orderCode, next);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        next === PaymentStatus.PAID
          ? "Đã ghi nhận thanh toán."
          : "Đã đánh dấu hoàn tiền.",
      );
      router.refresh();
    });
  };

  const renderStatusActions = () => {
    switch (order.status) {
      case OrderStatus.PENDING:
        return (
          <>
            <Button
              onClick={() => advanceStatus(OrderStatus.CONFIRMED)}
              loading={pending}
              className="w-full"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Xác nhận đơn
            </Button>
            <Button
              variant="danger"
              onClick={() => setCancelOpen(true)}
              disabled={pending}
              className="w-full"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Huỷ đơn
            </Button>
          </>
        );
      case OrderStatus.CONFIRMED:
        return (
          <>
            <Button
              onClick={() => advanceStatus(OrderStatus.PACKING)}
              loading={pending}
              className="w-full"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Đóng gói
            </Button>
            <Button
              variant="danger"
              onClick={() => setCancelOpen(true)}
              disabled={pending}
              className="w-full"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Huỷ đơn
            </Button>
          </>
        );
      case OrderStatus.PACKING:
        return (
          <Button
            onClick={() => advanceStatus(OrderStatus.SHIPPING)}
            loading={pending}
            className="w-full"
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
            Đã vận chuyển
          </Button>
        );
      case OrderStatus.SHIPPING:
        return (
          <Button
            onClick={() => advanceStatus(OrderStatus.COMPLETED)}
            loading={pending}
            className="w-full"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Hoàn thành
          </Button>
        );
      case OrderStatus.COMPLETED:
        return (
          <p className="rounded-md bg-mint-50 px-3 py-2 text-sm text-mint-600">
            Đơn đã hoàn thành.
          </p>
        );
      case OrderStatus.CANCELED:
        return (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">
            Đơn đã huỷ.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trạng thái đơn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Badge variant={STATUS_BADGE[order.status]} className="text-sm">
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <div className="flex flex-col gap-2">{renderStatusActions()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Badge
            variant={PAYMENT_STATUS_BADGE[order.paymentStatus]}
            className="text-sm"
          >
            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </Badge>

          {order.paidAt ? (
            <p className="text-xs text-ink-500">
              Đã thanh toán lúc {formatDate(order.paidAt, true)}
            </p>
          ) : null}

          {order.paymentStatus === PaymentStatus.UNPAID ? (
            <Button
              variant="secondary"
              onClick={() => changePayment(PaymentStatus.PAID)}
              loading={pending}
              className="w-full"
            >
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Xác nhận đã thanh toán
            </Button>
          ) : null}
          {order.paymentStatus === PaymentStatus.PAID ? (
            <Button
              variant="outline"
              onClick={() => changePayment(PaymentStatus.REFUNDED)}
              loading={pending}
              className="w-full"
            >
              Đánh dấu hoàn tiền
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Huỷ đơn {order.orderCode}?</DialogTitle>
            <DialogDescription>
              Tồn kho sẽ được hoàn lại cho từng biến thể. Hành động này không
              thể đảo ngược.
            </DialogDescription>
          </DialogHeader>

          <FormField label="Lý do (ghi chú nội bộ)">
            <Textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={3}
              placeholder="Khách yêu cầu, hết hàng, sai địa chỉ..."
            />
          </FormField>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={pending}
            >
              Quay lại
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              loading={pending}
            >
              Huỷ đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
