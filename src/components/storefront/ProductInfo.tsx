"use client";

import * as React from "react";
import Link from "next/link";
import {
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Truck,
  Undo2,
} from "lucide-react";
import { Badge, Input } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";
import { SizeChartDialog } from "./SizeChartDialog";
import { AddToCartButton } from "./AddToCartButton";
import { BuyNowButton } from "./BuyNowButton";

interface VariantInfo {
  id: string;
  sku: string;
  size: string;
  sizeNote: string | null;
  color: string;
  colorHex: string | null;
  price: number | null;
  stock: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; name: string; slug: string } | null;
}

export interface ProductInfoData {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  comparePrice: number | null;
  primaryImageUrl: string | null;
  category: CategoryInfo;
  variants: ReadonlyArray<VariantInfo>;
}

export interface ProductInfoProps {
  product: ProductInfoData;
}

const SHORT_DESCRIPTION_THRESHOLD = 200;

export function ProductInfo({ product }: ProductInfoProps) {
  const { variants } = product;

  const uniqueSizes = React.useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of variants) {
      if (!seen.has(v.size)) {
        seen.add(v.size);
        result.push(v.size);
      }
    }
    return result;
  }, [variants]);

  const sizesWithStock = React.useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) {
      if (v.stock > 0) set.add(v.size);
    }
    return set;
  }, [variants]);

  const initialSize = React.useMemo(
    () => uniqueSizes.find((s) => sizesWithStock.has(s)) ?? null,
    [uniqueSizes, sizesWithStock],
  );

  const [selectedSize, setSelectedSize] = React.useState<string | null>(
    initialSize,
  );
  const [selectedColor, setSelectedColor] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);

  // Colors available given the currently selected size (or any size if none).
  const availableColors = React.useMemo(() => {
    const seen = new Map<string, VariantInfo>();
    for (const v of variants) {
      if (selectedSize && v.size !== selectedSize) continue;
      if (v.stock <= 0) continue;
      if (!seen.has(v.color)) seen.set(v.color, v);
    }
    return Array.from(seen.values());
  }, [variants, selectedSize]);

  // Reset color if it becomes unavailable for the chosen size.
  React.useEffect(() => {
    if (selectedColor === null) return;
    const stillAvailable = availableColors.some(
      (v) => v.color === selectedColor,
    );
    if (!stillAvailable) setSelectedColor(null);
  }, [availableColors, selectedColor]);

  const selectedVariant = React.useMemo(() => {
    if (!selectedSize || !selectedColor) return null;
    return (
      variants.find(
        (v) => v.size === selectedSize && v.color === selectedColor,
      ) ?? null
    );
  }, [variants, selectedSize, selectedColor]);

  const currentPrice = selectedVariant?.price ?? product.basePrice;
  const currentStock = selectedVariant?.stock ?? null;
  const hasSale =
    product.comparePrice !== null && product.comparePrice > currentPrice;
  const discountPercent = hasSale && product.comparePrice
    ? Math.round(((product.comparePrice - currentPrice) / product.comparePrice) * 100)
    : 0;

  const selectedSizeNote = React.useMemo(() => {
    if (!selectedSize) return null;
    const v = variants.find((x) => x.size === selectedSize && x.sizeNote);
    return v?.sizeNote ?? null;
  }, [variants, selectedSize]);

  const maxQty = currentStock ?? 99;

  // Clamp quantity if max changes.
  React.useEffect(() => {
    setQuantity((q) => {
      if (q < 1) return 1;
      if (q > maxQty) return Math.max(1, maxQty);
      return q;
    });
  }, [maxQty]);

  const isDescriptionLong =
    product.description.length > SHORT_DESCRIPTION_THRESHOLD;
  const showAddDisabled =
    !selectedVariant || currentStock === 0 || currentStock === null;

  function handleQuantityInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") {
      setQuantity(1);
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    if (n < 1) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.min(n, maxQty));
  }

  const addToCartProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    basePrice: product.basePrice,
    primaryImageUrl: product.primaryImageUrl,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Category breadcrumb-ish */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
        {product.category.parent ? (
          <>
            <Link
              href={`/products?category=${product.category.parent.slug}`}
              className="hover:text-coral-600"
            >
              {product.category.parent.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <Link
          href={`/products?category=${product.category.slug}`}
          className="hover:text-coral-600"
        >
          {product.category.name}
        </Link>
      </div>

      <h1 className="text-2xl font-semibold leading-tight text-ink-900 lg:text-3xl">
        {product.name}
      </h1>

      {/* Price block */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-bold text-coral-600">
          {formatVnd(currentPrice)}
        </span>
        {hasSale && product.comparePrice ? (
          <>
            <span className="text-base text-ink-500 line-through">
              {formatVnd(product.comparePrice)}
            </span>
            <Badge variant="coral">-{discountPercent}%</Badge>
          </>
        ) : null}
      </div>

      {/* Short description */}
      {product.description ? (
        <div className="text-sm text-ink-700">
          <p
            className={cn(
              "whitespace-pre-wrap",
              !descriptionExpanded && isDescriptionLong && "line-clamp-3",
            )}
          >
            {product.description}
          </p>
          {isDescriptionLong ? (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-coral-600 hover:text-coral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
            >
              {descriptionExpanded ? "Thu gọn" : "Xem thêm"}
            </button>
          ) : null}
        </div>
      ) : null}

      <hr className="border-ink-200" />

      {/* Size selector */}
      {uniqueSizes.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink-900">
              Kích cỡ
              {selectedSizeNote ? (
                <span className="ml-2 text-xs font-normal italic text-ink-500">
                  {selectedSize} — {selectedSizeNote}
                </span>
              ) : null}
            </span>
            <SizeChartDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-coral-600 hover:text-coral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500"
                >
                  <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                  Bảng quy đổi size
                </button>
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map((size) => {
              const isAvailable = sizesWithStock.has(size);
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Kích cỡ ${size}`}
                  disabled={!isAvailable}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "inline-flex h-10 min-w-[3rem] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
                    isSelected
                      ? "border-ink-900 bg-ink-900 text-white"
                      : isAvailable
                        ? "border-ink-200 bg-white text-ink-900 hover:border-ink-900"
                        : "cursor-not-allowed border-ink-200 bg-cream-50 text-ink-500 line-through opacity-60",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Color selector */}
      {availableColors.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-ink-900">Màu sắc</span>
            {selectedColor ? (
              <span className="text-xs text-ink-500">— {selectedColor}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((v) => {
              const isSelected = selectedColor === v.color;
              return (
                <button
                  key={v.color}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Màu ${v.color}`}
                  onClick={() => setSelectedColor(v.color)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
                    isSelected
                      ? "border-transparent ring-2 ring-coral-500 ring-offset-2"
                      : "border-ink-200 hover:border-ink-500",
                  )}
                  style={
                    v.colorHex ? { backgroundColor: v.colorHex } : undefined
                  }
                >
                  {!v.colorHex ? (
                    <span className="text-xs font-medium text-ink-900">
                      {v.color.charAt(0).toUpperCase()}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Quantity */}
      <div>
        <span className="mb-2 block text-sm font-medium text-ink-900">
          Số lượng
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-900 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={handleQuantityInput}
            aria-label="Số lượng"
            className="h-10 w-16 text-center"
          />
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-900 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {currentStock !== null && currentStock < 10 ? (
          <p
            className={cn(
              "mt-2 text-xs",
              currentStock === 0
                ? "text-danger"
                : currentStock <= 4
                  ? "text-warning"
                  : "text-mint-600",
            )}
          >
            {currentStock === 0
              ? "Hết hàng"
              : `Còn ${currentStock} sản phẩm`}
          </p>
        ) : null}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {selectedVariant ? (
          <>
            <AddToCartButton
              variant={selectedVariant}
              product={addToCartProduct}
              quantity={quantity}
              disabled={showAddDisabled}
              className="w-full sm:flex-1"
            />
            <BuyNowButton
              variant={selectedVariant}
              product={addToCartProduct}
              quantity={quantity}
              disabled={showAddDisabled}
              className="w-full sm:flex-1"
            />
          </>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-coral-500 px-6 text-base font-medium text-white opacity-50 sm:flex-1"
            >
              Thêm vào giỏ
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-6 text-base font-medium text-ink-900 opacity-50 sm:flex-1"
            >
              Mua ngay
            </button>
          </>
        )}
      </div>

      {/* Trust badges */}
      <div className="mt-2 grid grid-cols-3 gap-3 border-t border-ink-200 pt-4">
        <TrustBadge
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />}
          label="Hàng chính hãng"
        />
        <TrustBadge
          icon={<Truck className="h-5 w-5" strokeWidth={1.5} />}
          label="Giao toàn quốc"
        />
        <TrustBadge
          icon={<Undo2 className="h-5 w-5" strokeWidth={1.5} />}
          label="Đổi trả 7 ngày"
        />
      </div>
    </div>
  );
}

function TrustBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center text-xs text-ink-700">
      <span className="text-mint-600" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
