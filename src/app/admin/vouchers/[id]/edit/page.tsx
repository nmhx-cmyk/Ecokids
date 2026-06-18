import Link from 'next/link';
import { notFound } from 'next/navigation';

import { VoucherForm } from '@/components/admin/VoucherForm';
import { Button } from '@/components/ui/button';
import { getVoucherById } from '@/lib/queries/vouchers';

export const metadata = {
  title: 'Sửa mã giảm giá',
};

export default async function EditVoucherPage({
  params,
}: {
  params: { id: string };
}) {
  const voucher = await getVoucherById(params.id);

  if (!voucher) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-ink-500"
        >
          <Link href="/admin/vouchers">← Quay lại danh sách</Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            Sửa mã giảm giá: {voucher.code}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Đã dùng {voucher.usageCount} lượt.
          </p>
        </div>
      </header>

      <VoucherForm
        mode="edit"
        currentId={voucher.id}
        initialData={{
          code: voucher.code,
          description: voucher.description,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          minOrderValue: voucher.minOrderValue,
          maxDiscount: voucher.maxDiscount,
          usageLimit: voucher.usageLimit,
          perUserLimit: voucher.perUserLimit,
          startsAt: voucher.startsAt,
          endsAt: voucher.endsAt,
          isActive: voucher.isActive,
        }}
      />
    </div>
  );
}
