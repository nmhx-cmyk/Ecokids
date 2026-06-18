import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FlashSaleForm } from '@/components/admin/FlashSaleForm';
import { Button } from '@/components/ui/button';
import { getFlashSaleById } from '@/lib/queries/flash-sales';
import { getProductOptions } from '@/lib/queries/product-options';

export const metadata = {
  title: 'Sửa chương trình Flash Sale',
};

export default async function EditFlashSalePage({
  params,
}: {
  params: { id: string };
}) {
  const [flashSale, products] = await Promise.all([
    getFlashSaleById(params.id),
    getProductOptions(),
  ]);

  if (!flashSale) {
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
          <Link href="/admin/flash-sales">← Quay lại danh sách</Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            Sửa chương trình: {flashSale.name}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Đang có {flashSale.items.length} sản phẩm trong chương trình.
          </p>
        </div>
      </header>

      <FlashSaleForm
        mode="edit"
        currentId={flashSale.id}
        products={products}
        initialData={{
          name: flashSale.name,
          startsAt: flashSale.startsAt,
          endsAt: flashSale.endsAt,
          isActive: flashSale.isActive,
          items: flashSale.items.map((item) => ({
            productId: item.productId,
            salePrice: item.salePrice,
          })),
        }}
      />
    </div>
  );
}
