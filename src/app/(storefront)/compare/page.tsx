"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Scale, X } from "lucide-react";

import { StarRating } from "@/components/storefront/StarRating";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { getCompareProducts, type CompareProduct } from "@/lib/server/compare";
import { useCompareStore } from "@/stores/compare-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatVnd } from "@/lib/utils/format";

export default function ComparePage() {
  const hydrated = useHydrated();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    setLoading(true);
    getCompareProducts(ids)
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, ids]);

  if (!hydrated || loading) {
    return (
      <div className="container flex min-h-[40vh] items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container max-w-2xl py-12">
        <EmptyState
          icon={<Scale className="h-6 w-6" strokeWidth={1.5} />}
          title="Chưa có sản phẩm để so sánh"
          description="Thêm sản phẩm vào so sánh bằng nút cân ở mỗi sản phẩm."
          action={
            <Button asChild>
              <Link href="/products">Khám phá sản phẩm</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    {
      label: "Giá",
      render: (p) => (
        <span className="font-semibold text-ink-900">{formatVnd(p.basePrice)}</span>
      ),
    },
    {
      label: "Giá gốc",
      render: (p) =>
        p.comparePrice && p.comparePrice > p.basePrice ? (
          <span className="text-ink-500 line-through">{formatVnd(p.comparePrice)}</span>
        ) : (
          "—"
        ),
    },
    {
      label: "Đánh giá",
      render: (p) =>
        p.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <StarRating value={p.ratingAvg} size="sm" />
            <span className="text-xs text-ink-500">({p.ratingCount})</span>
          </span>
        ) : (
          "Chưa có"
        ),
    },
    { label: "Chất liệu", render: (p) => p.material || "—" },
    { label: "Xuất xứ", render: (p) => p.origin || "—" },
    {
      label: "Tình trạng",
      render: (p) =>
        p.totalStock > 0 ? (
          <span className="text-mint-600">Còn hàng</span>
        ) : (
          <span className="text-warning">Hết hàng</span>
        ),
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-900">So sánh sản phẩm</h1>
        <Button variant="ghost" size="sm" onClick={clear}>
          Xoá tất cả
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="w-32" />
              {products.map((p) => (
                <th key={p.id} className="p-3 align-top">
                  <div className="relative rounded-xl border border-ink-200 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      aria-label={`Bỏ ${p.name}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-ink-400 hover:bg-cream-100 hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Link href={`/products/${p.slug}`} className="block">
                      <div className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-lg bg-cream-100">
                        {p.primaryImage ? (
                          <Image
                            src={p.primaryImage.url}
                            alt={p.primaryImage.alt || p.name}
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-ink-900">
                        {p.name}
                      </p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-ink-200">
                <td className="p-3 text-sm font-medium text-ink-500">{row.label}</td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 text-sm text-ink-700">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
