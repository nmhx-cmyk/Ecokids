'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { DiscountType } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createVoucher, updateVoucher } from '@/lib/server/vouchers';
import type { VoucherInput } from '@/lib/validations/voucher';

type Mode = 'create' | 'edit';

export interface VoucherFormProps {
  mode: Mode;
  currentId?: string;
  initialData?: {
    code: string;
    description: string | null;
    discountType: DiscountType;
    discountValue: number;
    minOrderValue: number;
    maxDiscount: number | null;
    usageLimit: number | null;
    perUserLimit: number | null;
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
  };
}

// Convert a Date into the local-time string a <input type="datetime-local"> expects.
function toLocalInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultRange(): { startsAt: string; endsAt: string } {
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt: toLocalInput(now), endsAt: toLocalInput(inOneWeek) };
}

// Parse a positive-integer-or-empty string into number | null.
function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function VoucherForm({ mode, currentId, initialData }: VoucherFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const range = defaultRange();

  const [code, setCode] = useState(initialData?.code ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialData?.discountType ?? 'PERCENT',
  );
  const [discountValue, setDiscountValue] = useState(
    initialData ? String(initialData.discountValue) : '',
  );
  const [minOrderValue, setMinOrderValue] = useState(
    initialData ? String(initialData.minOrderValue) : '0',
  );
  const [maxDiscount, setMaxDiscount] = useState(
    initialData?.maxDiscount != null ? String(initialData.maxDiscount) : '',
  );
  const [usageLimit, setUsageLimit] = useState(
    initialData?.usageLimit != null ? String(initialData.usageLimit) : '',
  );
  const [perUserLimit, setPerUserLimit] = useState(
    initialData?.perUserLimit != null ? String(initialData.perUserLimit) : '',
  );
  const [startsAt, setStartsAt] = useState(
    initialData ? toLocalInput(initialData.startsAt) : range.startsAt,
  );
  const [endsAt, setEndsAt] = useState(
    initialData ? toLocalInput(initialData.endsAt) : range.endsAt,
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload: VoucherInput = {
      code: code.trim().toUpperCase(),
      description: description.trim() ? description.trim() : null,
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue || '0'),
      maxDiscount: parseOptionalInt(maxDiscount),
      usageLimit: parseOptionalInt(usageLimit),
      perUserLimit: parseOptionalInt(perUserLimit),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      isActive,
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createVoucher(payload)
          : await updateVoucher(currentId ?? '', payload);

      if (result.ok) {
        toast.success(
          mode === 'create' ? 'Đã tạo mã giảm giá' : 'Đã cập nhật mã giảm giá',
        );
        router.push('/admin/vouchers');
        router.refresh();
        return;
      }

      toast.error(result.error.message);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-6 pb-24 lg:pb-0"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>Thông tin mã giảm giá</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Mã giảm giá"
            htmlFor="voucher-code"
            required
            hint="Chỉ chữ HOA, số, gạch ngang/dưới. Tối thiểu 3 ký tự."
          >
            <Input
              id="voucher-code"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="font-mono uppercase"
              placeholder="SUMMER2026"
            />
          </FormField>

          <FormField
            label="Mô tả"
            htmlFor="voucher-description"
            hint="Tối đa 200 ký tự. Không bắt buộc."
          >
            <Textarea
              id="voucher-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Giảm giá mùa hè cho toàn bộ đơn hàng"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Loại giảm giá" htmlFor="voucher-type" required>
              <Select
                id="voucher-type"
                value={discountType}
                onChange={(event) =>
                  setDiscountType(event.target.value as DiscountType)
                }
              >
                <option value="PERCENT">Theo phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định (VND)</option>
              </Select>
            </FormField>

            <FormField
              label={
                discountType === 'PERCENT'
                  ? 'Giá trị giảm (%)'
                  : 'Giá trị giảm (VND)'
              }
              htmlFor="voucher-value"
              required
            >
              <Input
                id="voucher-value"
                type="number"
                min={1}
                step={1}
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                placeholder={discountType === 'PERCENT' ? '10' : '50000'}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Đơn tối thiểu (VND)"
              htmlFor="voucher-min"
              hint="Để 0 nếu không yêu cầu."
            >
              <Input
                id="voucher-min"
                type="number"
                min={0}
                step={1}
                value={minOrderValue}
                onChange={(event) => setMinOrderValue(event.target.value)}
              />
            </FormField>

            <FormField
              label="Giảm tối đa (VND)"
              htmlFor="voucher-max"
              hint="Áp dụng cho giảm theo %. Để trống nếu không giới hạn."
            >
              <Input
                id="voucher-max"
                type="number"
                min={1}
                step={1}
                value={maxDiscount}
                onChange={(event) => setMaxDiscount(event.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Tổng lượt dùng"
              htmlFor="voucher-usage-limit"
              hint="Để trống nếu không giới hạn."
            >
              <Input
                id="voucher-usage-limit"
                type="number"
                min={1}
                step={1}
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
              />
            </FormField>

            <FormField
              label="Lượt dùng / khách"
              htmlFor="voucher-per-user"
              hint="Để trống nếu không giới hạn."
            >
              <Input
                id="voucher-per-user"
                type="number"
                min={1}
                step={1}
                value={perUserLimit}
                onChange={(event) => setPerUserLimit(event.target.value)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thời gian & trạng thái</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Bắt đầu" htmlFor="voucher-starts" required>
              <Input
                id="voucher-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </FormField>

            <FormField label="Kết thúc" htmlFor="voucher-ends" required>
              <Input
                id="voucher-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <Checkbox
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            Kích hoạt mã giảm giá
          </label>
        </CardContent>
      </Card>

      <div className="hidden items-center justify-end gap-2 lg:flex">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/vouchers')}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Tạo mã giảm giá' : 'Lưu thay đổi'}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 border-t border-ink-200 bg-white px-4 py-3 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/vouchers')}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Tạo' : 'Lưu'}
        </Button>
      </div>
    </form>
  );
}
