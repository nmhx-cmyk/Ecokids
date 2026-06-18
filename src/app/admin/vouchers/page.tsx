import Link from 'next/link';
import { Pencil, Ticket } from 'lucide-react';

import { VoucherRowActions } from '@/components/admin/VoucherRowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getVouchers, type AdminVoucherRow } from '@/lib/queries/vouchers';
import { formatDate, formatVnd } from '@/lib/utils/format';

export const metadata = {
  title: 'Mã giảm giá',
};

function discountLabel(voucher: AdminVoucherRow): string {
  return voucher.discountType === 'PERCENT'
    ? `${voucher.discountValue}%`
    : formatVnd(voucher.discountValue);
}

function StatusBadge({ voucher }: { voucher: AdminVoucherRow }) {
  if (voucher.isRunning) {
    return <Badge variant="mint">Đang chạy</Badge>;
  }
  if (voucher.isActive) {
    return <Badge variant="default">Đang bật</Badge>;
  }
  return <Badge variant="danger">Tắt</Badge>;
}

export default async function AdminVouchersPage() {
  const vouchers = await getVouchers();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Mã giảm giá</h2>
          <p className="mt-1 text-sm text-ink-500">
            Quản lý các mã giảm giá áp dụng khi thanh toán.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/vouchers/new">+ Thêm mã giảm giá</Link>
        </Button>
      </header>

      {vouchers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ticket className="h-5 w-5" aria-hidden="true" />}
            title="Chưa có mã giảm giá nào"
            description="Tạo mã giảm giá đầu tiên để khuyến mãi cho khách hàng."
            action={
              <Button asChild>
                <Link href="/admin/vouchers/new">Tạo mã giảm giá đầu tiên</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-3 border-b border-ink-200 bg-cream-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500 lg:flex">
            <div className="min-w-0 flex-1">Mã</div>
            <div className="w-28">Loại / Giá trị</div>
            <div className="w-32">Đơn tối thiểu</div>
            <div className="w-24">Lượt dùng</div>
            <div className="w-56">Hiệu lực</div>
            <div className="w-24">Trạng thái</div>
            <div className="w-24 text-right">Hành động</div>
          </div>
          <div>
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className="flex flex-col gap-3 border-t border-ink-200 px-4 py-3 first:border-t-0 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-ink-900">
                    {voucher.code}
                  </p>
                  {voucher.description ? (
                    <p className="truncate text-xs text-ink-500">
                      {voucher.description}
                    </p>
                  ) : null}
                </div>
                <div className="w-28 text-sm text-ink-700">
                  <span className="lg:hidden">Giá trị: </span>
                  {discountLabel(voucher)}
                </div>
                <div className="w-32 text-sm text-ink-700">
                  <span className="lg:hidden">Đơn tối thiểu: </span>
                  {formatVnd(voucher.minOrderValue)}
                </div>
                <div className="w-24 text-sm text-ink-700">
                  <span className="lg:hidden">Lượt dùng: </span>
                  {voucher.usageCount}/
                  {voucher.usageLimit === null ? '∞' : voucher.usageLimit}
                </div>
                <div className="w-56 text-sm text-ink-700">
                  {formatDate(voucher.startsAt)} – {formatDate(voucher.endsAt)}
                </div>
                <div className="w-24">
                  <StatusBadge voucher={voucher} />
                </div>
                <div className="flex w-auto items-center justify-end gap-1 lg:w-24">
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/admin/vouchers/${voucher.id}/edit`}
                      aria-label={`Sửa ${voucher.code}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Sửa</span>
                    </Link>
                  </Button>
                  <VoucherRowActions
                    voucher={{ id: voucher.id, code: voucher.code }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
