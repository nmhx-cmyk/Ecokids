import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { formatVnd } from "@/lib/utils/format";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  primaryImage: { url: string; alt: string } | null;
  isNew: boolean;
  totalStock: number;
}

interface PrismaProductLike {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  createdAt: Date;
  images: ReadonlyArray<{ url: string; alt: string; isPrimary: boolean }>;
  variants: ReadonlyArray<{ stock: number }>;
}

const NEW_WINDOW_DAYS = 14;
const NEW_WINDOW_MS = NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function toProductCardData(product: PrismaProductLike): ProductCardData {
  const primary =
    product.images.find((img) => img.isPrimary) ?? product.images[0] ?? null;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const isNew = Date.now() - product.createdAt.getTime() < NEW_WINDOW_MS;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    basePrice: product.basePrice,
    comparePrice: product.comparePrice,
    primaryImage: primary
      ? { url: primary.url, alt: primary.alt }
      : null,
    isNew,
    totalStock,
  };
}

export interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const {
    slug,
    name,
    basePrice,
    comparePrice,
    primaryImage,
    isNew,
    totalStock,
  } = product;
  const isOutOfStock = totalStock === 0;
  const hasSale = comparePrice !== null && comparePrice > basePrice;

  return (
    <Link
      href={`/products/${slug}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-ink-200/60 bg-white transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2",
        className,
      )}
    >
      <div className="relative aspect-[4/5] bg-cream-100">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt || name}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 48vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-display text-6xl font-bold text-coral-500"
            aria-hidden="true"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          {isNew ? <Badge variant="coral">MỚI</Badge> : null}
          {hasSale ? <Badge variant="danger">SALE</Badge> : null}
          {isOutOfStock ? <Badge variant="warning">Hết hàng</Badge> : null}
        </div>

        <div
          className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-500 shadow-sm"
          title="Tính năng sắp ra mắt"
          aria-hidden="true"
        >
          <Heart className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight text-ink-900">
          {name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-ink-900">
            {formatVnd(basePrice)}
          </span>
          {hasSale && comparePrice !== null ? (
            <span className="text-sm text-ink-500 line-through">
              {formatVnd(comparePrice)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200/60 bg-white">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  );
}
