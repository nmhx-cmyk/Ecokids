import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge, Skeleton } from "@/components/ui";
import { CompareButton } from "@/components/storefront/CompareButton";
import { WishlistButton } from "@/components/storefront/WishlistButton";
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
  ratingAvg: number;
  ratingCount: number;
}

interface PrismaProductLike {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  comparePrice: number | null;
  createdAt: Date;
  ratingAvg: number;
  ratingCount: number;
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
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
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
    ratingAvg,
    ratingCount,
  } = product;
  const isOutOfStock = totalStock === 0;
  const hasSale = comparePrice !== null && comparePrice > basePrice;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-ink-200/60 bg-white transition-all hover:-translate-y-0.5 hover:shadow-sm",
        className,
      )}
    >
      <Link
        href={`/products/${slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
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
              className="flex h-full w-full items-center justify-center font-display text-6xl font-bold text-coral-600"
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
        </div>

        <div className="p-3 sm:p-4">
          <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight text-ink-900">
            {name}
          </h3>
          {ratingCount > 0 ? (
            <div className="mb-1.5 flex items-center gap-1 text-xs text-ink-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-ink-700">
                {ratingAvg.toFixed(1)}
              </span>
              <span>({ratingCount})</span>
            </div>
          ) : null}
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

      {/* Action buttons overlay the card but sit outside the <Link> for valid markup. */}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
        <WishlistButton productId={product.id} />
        <CompareButton productId={product.id} productName={name} />
      </div>
    </div>
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
