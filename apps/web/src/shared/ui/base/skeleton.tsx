import { cn } from '@/shared/lib/utils';

/** A labelled skeleton announces itself as a loading status (a plain div can't carry a label). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      {...(props['aria-label'] ? { role: 'status' } : {})}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
