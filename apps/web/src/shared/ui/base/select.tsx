import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Native select (keyboard, mobile pickers and SSR for free) with the browser arrow replaced by a
 * chevron that sits inside the padding, so it never touches the edge.
 */
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <span data-slot="select" className={cn('relative inline-flex w-full', className)}>
      <select
        className={cn(
          'h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface pr-10 pl-4 text-[15px] text-ink transition-colors outline-none',
          'focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
    </span>
  );
}

export { Select };
