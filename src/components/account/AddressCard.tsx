"use client";

import { Pencil, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPhoneVn } from "@/lib/utils/format";
import type { UserAddress } from "@/lib/queries/addresses";

interface AddressCardProps {
  address: UserAddress;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export function AddressCard({
  address,
  pending,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const fullAddress = [
    address.addressLine,
    address.ward,
    address.district,
    address.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">
              {address.recipientName}
            </p>
            <p className="mt-0.5 text-sm text-ink-700">
              {formatPhoneVn(address.phone)}
            </p>
          </div>
          {address.isDefault ? (
            <Badge variant="coral" className="shrink-0">
              Mặc định
            </Badge>
          ) : null}
        </div>

        <p className="text-sm text-ink-700">{fullAddress}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={pending}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Sửa
          </Button>
          {!address.isDefault ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSetDefault}
              disabled={pending}
            >
              <Star className="h-4 w-4" aria-hidden="true" />
              Đặt mặc định
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="ml-auto text-danger hover:text-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Xoá
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
