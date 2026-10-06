import { Skeleton } from '@/shared/ui/base/skeleton';

export function ProductCardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3"
    >
      <span className="sr-only">Loading product</span>
      <Skeleton className="aspect-square w-full bg-muted" />
      <Skeleton className="h-4 w-1/3 bg-muted" />
      <Skeleton className="h-5 w-3/4 bg-muted" />
      <Skeleton className="h-4 w-1/2 bg-muted" />
      <Skeleton className="h-7 w-2/5 bg-muted" />
    </div>
  );
}
