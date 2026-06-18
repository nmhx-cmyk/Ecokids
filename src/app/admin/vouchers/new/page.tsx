import Link from 'next/link';

import { VoucherForm } from '@/components/admin/VoucherForm';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Thêm mã giảm giá',
};

export default function NewVoucherPage() {
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
            Thêm mã giảm giá
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Tạo mã giảm giá mới và thiết lập điều kiện áp dụng.
          </p>
        </div>
      </header>

      <VoucherForm mode="create" />
    </div>
  );
}
