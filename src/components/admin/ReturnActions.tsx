"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resolveReturn } from "@/lib/server/returns";
import type { ReturnAction } from "@/lib/validations/return";

interface ReturnActionsProps {
  returnId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
}

export function ReturnActions({ returnId, status }: ReturnActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  const run = (action: ReturnAction) => {
    startTransition(async () => {
      const result = await resolveReturn(returnId, action, note);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Đã cập nhật yêu cầu trả hàng");
      router.refresh();
    });
  };

  if (status === "REJECTED" || status === "REFUNDED") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú xử lý (không bắt buộc)"
        className="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
      />
      <div className="flex flex-wrap gap-2">
        {status === "REQUESTED" ? (
          <>
            <Button type="button" size="sm" onClick={() => run("APPROVED")} loading={isPending}>
              <Check className="h-4 w-4" aria-hidden="true" /> Duyệt
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={() => run("REJECTED")}
              loading={isPending}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Từ chối
            </Button>
          </>
        ) : null}
        {status === "APPROVED" ? (
          <Button type="button" size="sm" onClick={() => run("REFUNDED")} loading={isPending}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Xác nhận hoàn tiền + nhập kho
          </Button>
        ) : null}
      </div>
    </div>
  );
}
