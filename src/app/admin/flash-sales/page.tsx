import Link from 'next/link';
import { Pencil, Zap } from 'lucide-react';

import { FlashSaleRowActions } from '@/components/admin/FlashSaleRowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getFlashSales,
  type AdminFlashSaleRow,
} from '@/lib/queries/flash-sales';
import { formatDate } from '@/lib/utils/format';

export const metadata = {
  title: 'Flash Sale',
};

function StatusBadge({ sale }: { sale: AdminFlashSaleRow }) {
  if (sale.isRunning) {
    return <Badge variant="mint">Đang chạy</Badge>;
  }
  if (sale.isActive) {
    return <Badge variant="default">Đang bật</Badge>;
  }
  return <Badge variant="danger">Tắt</Badge>;
}

export default async function AdminFlashSalesPage() {
  const sales = await getFlashSales();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Flash Sale</h2>
          <p className="mt-1 text-sm text-ink-500">
            Quản lý các chương trình giảm giá theo khung thời gian.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/flash-sales/new">+ Thêm chương trình</Link>
        </Button>
      </header>

      {sales.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Zap className="h-5 w-5" aria-hidden="true" />}
            title="Chưa có chương trình nào"
            description="Tạo chương trình Flash Sale đầu tiên để giảm giá sản phẩm theo thời gian."
            action={
              <Button asChild>
                <Link href="/admin/flash-sales/new">
                  Tạo chương trình đầu tiên
                </Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden items-center gap-3 border-b border-ink-200 bg-cream-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500 sm:flex">
            <div className="min-w-0 flex-1">Tên</div>
            <div className="w-20">Số SP</div>
            <div className="w-56">Thời gian</div>
            <div className="w-24">Trạng thái</div>
            <div className="w-24 text-right">Hành động</div>
          </div>
          <div>
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex flex-col gap-3 border-t border-ink-200 px-4 py-3 first:border-t-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {sale.name}
                  </p>
                </div>
                <div className="w-20 text-sm text-ink-700">
                  <span className="sm:hidden">Số SP: </span>
                  {sale.itemCount} SP
                </div>
                <div className="w-56 text-sm text-ink-700">
                  {formatDate(sale.startsAt, true)} –{' '}
                  {formatDate(sale.endsAt, true)}
                </div>
                <div className="w-24">
                  <StatusBadge sale={sale} />
                </div>
                <div className="flex w-auto items-center justify-end gap-1 sm:w-24">
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/admin/flash-sales/${sale.id}/edit`}
                      aria-label={`Sửa ${sale.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Sửa</span>
                    </Link>
                  </Button>
                  <FlashSaleRowActions
                    flashSale={{ id: sale.id, name: sale.name }}
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
