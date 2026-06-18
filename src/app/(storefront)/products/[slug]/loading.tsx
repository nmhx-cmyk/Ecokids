import { Skeleton } from "@/components/ui";

export default function ProductDetailLoading() {
  return (
    <div className="container max-w-7xl py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Hero skeleton */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
          <div className="hidden gap-2 sm:flex">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-20 w-20 rounded-lg" />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <hr className="border-ink-200" />
          <div>
            <Skeleton className="mb-2 h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-14 rounded-lg" />
              <Skeleton className="h-10 w-14 rounded-lg" />
              <Skeleton className="h-10 w-14 rounded-lg" />
              <Skeleton className="h-10 w-14 rounded-lg" />
            </div>
          </div>
          <div>
            <Skeleton className="mb-2 h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
