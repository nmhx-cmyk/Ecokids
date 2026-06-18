"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { VnDivisionsSelect } from "@/components/storefront/VnDivisionsSelect";
import type { UserAddress } from "@/lib/queries/addresses";
import { createAddress, updateAddress } from "@/lib/server/addresses";
import { addressSchema, type AddressInput } from "@/lib/validations/address";

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: UserAddress | null;
  onSuccess: () => void;
}

function emptyValues(): AddressInput {
  return {
    recipientName: "",
    phone: "",
    province: "",
    provinceCode: "",
    district: "",
    districtCode: "",
    ward: "",
    wardCode: "",
    addressLine: "",
    isDefault: false,
  };
}

function valuesFrom(address: UserAddress): AddressInput {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    province: address.province,
    provinceCode: address.provinceCode,
    district: address.district,
    districtCode: address.districtCode,
    ward: address.ward,
    wardCode: address.wardCode,
    addressLine: address.addressLine,
    isDefault: address.isDefault,
  };
}

export function AddressDialog({
  open,
  onOpenChange,
  initial,
  onSuccess,
}: AddressDialogProps) {
  const isEdit = initial !== null;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: initial ? valuesFrom(initial) : emptyValues(),
  });

  useEffect(() => {
    if (open) {
      reset(initial ? valuesFrom(initial) : emptyValues());
    }
  }, [open, initial, reset]);

  const provinceCode = watch("provinceCode");
  const province = watch("province");
  const districtCode = watch("districtCode");
  const district = watch("district");
  const wardCode = watch("wardCode");
  const ward = watch("ward");

  const onSubmit = handleSubmit(async (values) => {
    const result = isEdit
      ? await updateAddress(initial.id, values)
      : await createAddress(values);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    toast.success(isEdit ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ");
    onSuccess();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</DialogTitle>
          <DialogDescription>
            Địa chỉ sẽ được dùng khi đặt hàng và giao hàng.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Người nhận"
              htmlFor="recipientName"
              required
              error={errors.recipientName?.message}
            >
              <Input
                id="recipientName"
                autoComplete="name"
                {...register("recipientName")}
                error={Boolean(errors.recipientName)}
                placeholder="Nguyễn Văn A"
              />
            </FormField>

            <FormField
              label="Số điện thoại"
              htmlFor="phone"
              required
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register("phone")}
                error={Boolean(errors.phone)}
                placeholder="0901234567"
              />
            </FormField>
          </div>

          <FormField label="Khu vực" required>
            <VnDivisionsSelect
              value={{
                provinceCode,
                province,
                districtCode,
                district,
                wardCode,
                ward,
              }}
              onChange={(next) => {
                setValue("provinceCode", next.provinceCode, {
                  shouldValidate: true,
                });
                setValue("province", next.province, { shouldValidate: true });
                setValue("districtCode", next.districtCode, {
                  shouldValidate: true,
                });
                setValue("district", next.district, { shouldValidate: true });
                setValue("wardCode", next.wardCode, { shouldValidate: true });
                setValue("ward", next.ward, { shouldValidate: true });
              }}
              errors={{
                province: errors.province?.message,
                district: errors.district?.message,
                ward: errors.ward?.message,
              }}
            />
          </FormField>

          <FormField
            label="Số nhà, tên đường"
            htmlFor="addressLine"
            required
            error={errors.addressLine?.message}
          >
            <Input
              id="addressLine"
              autoComplete="street-address"
              {...register("addressLine")}
              error={Boolean(errors.addressLine)}
              placeholder="123 Lê Lợi"
            />
          </FormField>

          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(c) => field.onChange(c === true)}
                />
                Đặt làm địa chỉ mặc định
              </label>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Huỷ
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Lưu thay đổi" : "Thêm địa chỉ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
