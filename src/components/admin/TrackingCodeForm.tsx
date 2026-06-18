"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTrackingCode } from "@/lib/server/admin-orders";

interface TrackingCodeFormProps {
  orderCode: string;
  initialCode: string | null;
}

export function TrackingCodeForm({ orderCode, initialCode }: TrackingCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateTrackingCode(orderCode, code);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Đã lưu mã vận đơn");
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Nhập mã vận đơn (GHN/GHTK...)"
      />
      <Button type="button" variant="ghost" onClick={save} loading={isPending}>
        Lưu
      </Button>
    </div>
  );
}
