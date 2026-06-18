"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import { AddressCard } from "@/components/account/AddressCard";
import { AddressDialog } from "@/components/account/AddressDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteAddress, setDefaultAddress } from "@/lib/server/addresses";
import type { UserAddress } from "@/lib/queries/addresses";

interface AddressListProps {
  initialAddresses: UserAddress[];
}

type DialogState =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "edit"; address: UserAddress };

export function AddressList({ initialAddresses }: AddressListProps) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [confirmDelete, setConfirmDelete] = useState<UserAddress | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isSettingDefault, startSetDefault] = useTransition();

  const handleSetDefault = (address: UserAddress) => {
    setPendingId(address.id);
    startSetDefault(async () => {
      const result = await setDefaultAddress(address.id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setAddresses((prev) =>
        prev
          .map((a) => ({ ...a, isDefault: a.id === address.id }))
          .sort((a, b) => {
            if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
            return b.createdAt.getTime() - a.createdAt.getTime();
          }),
      );
      toast.success("Đã đặt làm địa chỉ mặc định");
      router.refresh();
    });
  };

  const handleDelete = (address: UserAddress) => {
    setPendingId(address.id);
    startDelete(async () => {
      const result = await deleteAddress(address.id);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== address.id));
      setConfirmDelete(null);
      toast.success("Đã xoá địa chỉ");
      router.refresh();
    });
  };

  const handleDialogSuccess = () => {
    router.refresh();
  };

  const isEmpty = addresses.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink-900">
          Địa chỉ giao hàng
        </h2>
        {!isEmpty ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setDialog({ kind: "new" })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm địa chỉ
          </Button>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white">
          <EmptyState
            icon={<MapPin className="h-5 w-5" />}
            title="Chưa có địa chỉ nào"
            description="Thêm địa chỉ giao hàng để thanh toán nhanh hơn ở lần sau."
            action={
              <Button type="button" onClick={() => setDialog({ kind: "new" })}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Thêm địa chỉ đầu tiên
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              pending={
                pendingId === address.id && (isDeleting || isSettingDefault)
              }
              onEdit={() => setDialog({ kind: "edit", address })}
              onDelete={() => setConfirmDelete(address)}
              onSetDefault={() => handleSetDefault(address)}
            />
          ))}
        </div>
      )}

      <AddressDialog
        open={dialog.kind !== "none"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        initial={dialog.kind === "edit" ? dialog.address : null}
        onSuccess={handleDialogSuccess}
      />

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá địa chỉ?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Địa chỉ sẽ bị xoá vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={isDeleting}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isDeleting}
              onClick={() => {
                if (confirmDelete) handleDelete(confirmDelete);
              }}
            >
              Xoá địa chỉ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
