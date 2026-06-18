"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateAdminNote } from "@/lib/server/admin-orders";

interface AdminInternalNoteFormProps {
  orderCode: string;
  initialNote: string | null;
}

export function AdminInternalNoteForm({
  orderCode,
  initialNote,
}: AdminInternalNoteFormProps) {
  const router = useRouter();
  const [note, setNote] = React.useState(initialNote ?? "");
  const [pending, startTransition] = React.useTransition();

  const isDirty = note.trim() !== (initialNote ?? "").trim();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateAdminNote(orderCode, note);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Đã lưu ghi chú nội bộ.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Ghi chú riêng cho team, không hiển thị cho khách..."
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={pending}
          disabled={!isDirty}
          size="sm"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Lưu ghi chú
        </Button>
      </div>
    </div>
  );
}
