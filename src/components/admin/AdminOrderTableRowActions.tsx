"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, RefreshCw } from "lucide-react";
import { OrderStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { QuickStatusDialog } from "@/components/admin/QuickStatusDialog";
import { STATUS_TRANSITIONS } from "@/lib/constants/order-status";

interface AdminOrderTableRowActionsProps {
  orderCode: string;
  currentStatus: OrderStatus;
}

export function AdminOrderTableRowActions({
  orderCode,
  currentStatus,
}: AdminOrderTableRowActionsProps) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const canChangeStatus = STATUS_TRANSITIONS[currentStatus].length > 0;

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
            <Link href={`/admin/orders/${orderCode}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              Xem chi tiết
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canChangeStatus}
            onSelect={(e) => {
              e.preventDefault();
              if (canChangeStatus) setStatusOpen(true);
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Đổi nhanh trạng thái
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickStatusDialog
        orderCode={orderCode}
        currentStatus={currentStatus}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
    </>
  );
}
