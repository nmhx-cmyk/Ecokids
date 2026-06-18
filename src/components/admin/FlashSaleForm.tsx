'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

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
import { createFlashSale, updateFlashSale } from '@/lib/server/flash-sales';
import type { ProductOption } from '@/lib/queries/product-options';
import type {
  FlashSaleInput,
  FlashSaleItemInput,
} from '@/lib/validations/flash-sale';
import { formatVnd } from '@/lib/utils/format';

type Mode = 'create' | 'edit';

export interface FlashSaleFormProps {
  mode: Mode;
  products: ProductOption[];
  currentId?: string;
  initialData?: {
    name: string;
    startsAt: Date;
    endsAt: Date;
    isActive: boolean;
    items: { productId: string; salePrice: number }[];
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

export function FlashSaleForm({
  mode,
  products,
  currentId,
  initialData,
}: FlashSaleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const range = defaultRange();

  const [name, setName] = useState(initialData?.name ?? '');
  const [startsAt, setStartsAt] = useState(
    initialData ? toLocalInput(initialData.startsAt) : range.startsAt,
  );
  const [endsAt, setEndsAt] = useState(
    initialData ? toLocalInput(initialData.endsAt) : range.endsAt,
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [search, setSearch] = useState('');

  // Map productId -> salePrice as string (controlled inputs).
  const [selected, setSelected] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const item of initialData?.items ?? []) {
      map.set(item.productId, String(item.salePrice));
    }
    return map;
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  function toggleProduct(product: ProductOption, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(product.id, String(product.basePrice));
      } else {
        next.delete(product.id);
      }
      return next;
    });
  }

  function setPrice(productId: string, value: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(productId, value);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (selected.size === 0) {
      toast.error('Cần ít nhất 1 sản phẩm trong chương trình');
      return;
    }

    const items: FlashSaleItemInput[] = Array.from(selected.entries()).map(
      ([productId, salePrice]) => ({
        productId,
        salePrice: Number(salePrice),
      }),
    );

    const payload: FlashSaleInput = {
      name,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      isActive,
      items,
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createFlashSale(payload)
          : await updateFlashSale(currentId ?? '', payload);

      if (result.ok) {
        toast.success(
          mode === 'create'
            ? 'Đã tạo chương trình Flash Sale'
            : 'Đã cập nhật chương trình Flash Sale',
        );
        router.push('/admin/flash-sales');
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
          <CardTitle>Thông tin chương trình</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Tên chương trình" htmlFor="flash-name" required>
            <Input
              id="flash-name"
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Flash Sale cuối tuần"
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Bắt đầu" htmlFor="flash-starts" required>
              <Input
                id="flash-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </FormField>

            <FormField label="Kết thúc" htmlFor="flash-ends" required>
              <Input
                id="flash-ends"
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
            Kích hoạt chương trình
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Sản phẩm áp dụng ({selected.size} đã chọn)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm sản phẩm theo tên…"
          />

          {products.length === 0 ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-warning">
              Chưa có sản phẩm nào đang hoạt động để thêm vào chương trình.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border border-ink-200">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-ink-500">
                  Không tìm thấy sản phẩm phù hợp.
                </p>
              ) : (
                filteredProducts.map((product) => {
                  const isChecked = selected.has(product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex flex-col gap-2 border-t border-ink-200 px-3 py-2.5 first:border-t-0 sm:flex-row sm:items-center"
                    >
                      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-ink-900">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleProduct(product, checked === true)
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {product.name}
                          </span>
                          <span className="block text-xs text-ink-500">
                            Giá gốc: {formatVnd(product.basePrice)}
                          </span>
                        </span>
                      </label>
                      {isChecked ? (
                        <div className="w-full sm:w-40">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={selected.get(product.id) ?? ''}
                            onChange={(event) =>
                              setPrice(product.id, event.target.value)
                            }
                            aria-label={`Giá sale cho ${product.name}`}
                            placeholder="Giá sale"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="hidden items-center justify-end gap-2 lg:flex">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/flash-sales')}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Tạo chương trình' : 'Lưu thay đổi'}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 border-t border-ink-200 bg-white px-4 py-3 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/flash-sales')}
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
