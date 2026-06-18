import Link from 'next/link';

import { FlashSaleForm } from '@/components/admin/FlashSaleForm';
import { Button } from '@/components/ui/button';
import { getProductOptions } from '@/lib/queries/product-options';

export const metadata = {
  title: 'Thêm chương trình Flash Sale',
};

export default async function NewFlashSalePage() {
  const products = await getProductOptions();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit text-ink-500"
        >
          <Link href="/admin/flash-sales">← Quay lại danh sách</Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            Thêm chương trình Flash Sale
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Chọn sản phẩm và thiết lập giá sale theo khung thời gian.
          </p>
        </div>
      </header>

      <FlashSaleForm mode="create" products={products} />
    </div>
  );
}
