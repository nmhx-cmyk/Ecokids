import { PackageOpen } from "lucide-react";
import { EmptyState } from "@/components/ui";
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductCardData,
} from "./ProductCard";

export interface ProductGridProps {
  products: ProductCardData[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProductGrid({
  products,
  emptyTitle = "Chưa có sản phẩm",
  emptyDescription = "Vui lòng quay lại sau để khám phá những mẫu mới nhất.",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-6 w-6" strokeWidth={1.5} />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
