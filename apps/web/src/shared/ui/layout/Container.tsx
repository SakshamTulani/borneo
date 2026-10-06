import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

/** Content width (1280px) with the page gutter. Full-bleed sections sit outside it. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6', className)} {...props} />;
}
