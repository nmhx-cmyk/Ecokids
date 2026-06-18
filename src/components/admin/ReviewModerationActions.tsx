"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteReview,
  moderateReview,
  replyToReview,
} from "@/lib/server/reviews";

interface ReviewModerationActionsProps {
  reviewId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentReply: string | null;
}

export function ReviewModerationActions({
  reviewId,
  status,
  currentReply,
}: ReviewModerationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(currentReply ?? "");
  const [replySaving, setReplySaving] = useState(false);

  const runModeration = (next: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const result = await moderateReview(reviewId, next);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(next === "APPROVED" ? "Đã duyệt đánh giá" : "Đã từ chối đánh giá");
      router.refresh();
    });
  };

  const runDelete = () => {
    startTransition(async () => {
      const result = await deleteReview(reviewId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Đã xoá đánh giá");
      router.refresh();
    });
  };

  const submitReply = async () => {
    setReplySaving(true);
    const result = await replyToReview({ reviewId, reply: reply.trim() });
    setReplySaving(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Đã lưu phản hồi");
    setReplyOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status !== "APPROVED" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => runModeration("APPROVED")}
            loading={isPending}
          >
            <Check className="h-4 w-4" aria-hidden="true" /> Duyệt
          </Button>
        ) : null}
        {status !== "REJECTED" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => runModeration("REJECTED")}
            loading={isPending}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Từ chối
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setReplyOpen(true)}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {currentReply ? "Sửa phản hồi" : "Phản hồi"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-danger"
          onClick={runDelete}
          loading={isPending}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Xoá
        </Button>
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phản hồi đánh giá</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Nhập phản hồi công khai của shop..."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setReplyOpen(false)}
              disabled={replySaving}
            >
              Huỷ
            </Button>
            <Button type="button" onClick={submitReply} loading={replySaving}>
              Lưu phản hồi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
