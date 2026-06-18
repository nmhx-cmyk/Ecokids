"use client";

import { MapPin, Plus } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatPhoneVn } from "@/lib/utils/format";
import type { UserAddress } from "@/lib/queries/addresses";

interface AddressSelectorProps {
  savedAddresses: UserAddress[];
  selectedAddressId: string | null; // null = "new"
  onSelect: (addressId: string | null) => void;
}

const NEW_ADDRESS_VALUE = "__new__";

export function AddressSelector({
  savedAddresses,
  selectedAddressId,
  onSelect,
}: AddressSelectorProps) {
  const value = selectedAddressId ?? NEW_ADDRESS_VALUE;

  function handleChange(next: string) {
    onSelect(next === NEW_ADDRESS_VALUE ? null : next);
  }

  return (
    <RadioGroup value={value} onValueChange={handleChange} className="gap-3">
      {savedAddresses.map((addr) => {
        const checked = addr.id === selectedAddressId;
        return (
          <label
            key={addr.id}
            htmlFor={`addr-${addr.id}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-colors",
              checked
                ? "border-coral-500 ring-1 ring-coral-500"
                : "hover:border-ink-500/40",
            )}
          >
            <RadioGroupItem
              id={`addr-${addr.id}`}
              value={addr.id}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-900">
                  {addr.recipientName}
                </span>
                <span className="text-sm text-ink-500">
                  {formatPhoneVn(addr.phone)}
                </span>
                {addr.isDefault ? (
                  <span className="rounded-full bg-mint-50 px-2 py-0.5 text-xs font-medium text-mint-600">
                    Mặc định
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-start gap-1.5 text-sm text-ink-700">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500"
                  aria-hidden="true"
                />
                <span>
                  {addr.addressLine}, {addr.ward}, {addr.district},{" "}
                  {addr.province}
                </span>
              </div>
            </div>
          </label>
        );
      })}

      <label
        htmlFor={`addr-${NEW_ADDRESS_VALUE}`}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-cream-50 p-4 transition-colors",
          selectedAddressId === null
            ? "border-coral-500 bg-coral-50 ring-1 ring-coral-500"
            : "hover:border-ink-500/40",
        )}
      >
        <RadioGroupItem
          id={`addr-${NEW_ADDRESS_VALUE}`}
          value={NEW_ADDRESS_VALUE}
        />
        <Plus
          className="h-4 w-4 text-ink-700"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="font-medium text-ink-900">Dùng địa chỉ mới</span>
      </label>
    </RadioGroup>
  );
}
