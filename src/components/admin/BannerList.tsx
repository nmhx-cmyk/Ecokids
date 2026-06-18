"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteBanner, reorderBanners } from "@/lib/server/banners";

export interface BannerRow {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
}

function SortableBanner({
  banner,
  onDelete,
}: {
  banner: BannerRow;
  onDelete: (banner: BannerRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 ${
        isDragging ? "opacity-60 shadow-md" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-ink-400 hover:text-ink-700 active:cursor-grabbing"
        aria-label="Kéo để sắp xếp"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="relative h-12 w-24 shrink-0 overflow-hidden rounded-md bg-cream-100">
        <Image
          src={banner.imageUrl}
          alt={banner.title}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-900">{banner.title}</p>
        {banner.isActive ? (
          <Badge variant="mint">Đang hiển thị</Badge>
        ) : (
          <Badge variant="default">Đã ẩn</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/banners/${banner.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sửa</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-danger"
          onClick={() => onDelete(banner)}
          aria-label={`Xoá ${banner.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function BannerList({ initial }: { initial: BannerRow[] }) {
  const router = useRouter();
  const [banners, setBanners] = useState(initial);
  const [pendingDelete, setPendingDelete] = useState<BannerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(banners, oldIndex, newIndex);
    setBanners(next);
    void persistOrder(next.map((b) => b.id));
  };

  const persistOrder = async (ids: string[]) => {
    const result = await reorderBanners(ids);
    if (!result.ok) {
      toast.error(result.error.message);
      router.refresh();
      return;
    }
    toast.success("Đã lưu thứ tự");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteBanner(pendingDelete.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== pendingDelete.id));
    setPendingDelete(null);
    toast.success("Đã xoá banner");
    router.refresh();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={banners.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {banners.map((banner) => (
              <SortableBanner
                key={banner.id}
                banner={banner}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá banner</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-700">
            Xoá banner{" "}
            <span className="font-medium text-ink-900">
              {pendingDelete?.title}
            </span>
            ? Thao tác này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDelete}
              loading={deleting}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
