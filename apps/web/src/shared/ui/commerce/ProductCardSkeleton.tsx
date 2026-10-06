import { Skeleton } from '@/shared/ui/base/skeleton';

export function ProductCardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4"
    >
      <span className="sr-only">Loading product</span>
      <Skeleton className="aspect-square w-full rounded-[12px]" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="mt-2 h-5 w-2/5" />
    </div>
  );
}
