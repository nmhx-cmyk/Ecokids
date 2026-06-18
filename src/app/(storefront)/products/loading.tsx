import { Skeleton } from "@/components/ui";

export default function ProductsLoading() {
  return (
    <div className="container py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-[240px] shrink-0 flex-col gap-6 lg:flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </aside>

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Skeleton className="h-10 w-24 lg:hidden" />
            <Skeleton className="h-10 w-48 sm:ml-auto" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
