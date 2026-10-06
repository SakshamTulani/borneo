import * as React from 'react';
import { cn } from '@/shared/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-line-strong bg-surface px-4 text-base text-ink transition-colors outline-none placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand',
        'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
