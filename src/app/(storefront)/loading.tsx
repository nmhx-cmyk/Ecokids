import { Skeleton } from "@/components/ui";
import { ProductGridSkeleton } from "@/components/storefront/ProductGrid";

export default function StorefrontLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="mx-4 mt-4 rounded-3xl bg-cream-100 px-6 py-10 sm:px-10 lg:mx-8 lg:mt-8 lg:px-16 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-md space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-12 w-48" />
            </div>
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-2xl lg:aspect-[4/3]" />
        </div>
      </section>

      {/* Product grid skeleton */}
      <section className="container py-12">
        <Skeleton className="mx-auto mb-8 h-8 w-64" />
        <ProductGridSkeleton count={8} />
      </section>
    </>
  );
}
