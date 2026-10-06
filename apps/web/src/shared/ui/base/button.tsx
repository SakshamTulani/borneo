import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';
import { Loader2Icon } from 'lucide-react';
import { Slot } from 'radix-ui';

const buttonVariants = cva(
  // Pills are the action grammar; pressing scales to 0.97 (no shadows, no gradients).
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-[15px] font-normal whitespace-nowrap transition-[transform,background-color,color] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-brand text-brand-ink hover:bg-brand/90',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        // Ghost pill: the second CTA beside a primary one.
        outline: 'border border-brand bg-transparent text-brand hover:bg-brand-soft',
        secondary: 'bg-muted text-ink hover:bg-line',
        ghost: 'text-ink hover:bg-muted',
        link: 'text-brand underline-offset-4 hover:underline active:scale-100',
        // On dark tiles.
        onTile: 'border border-on-tile/40 bg-transparent text-on-tile hover:bg-on-tile/10',
      },
      size: {
        // Touch targets ≥ 44px (DESIGN.md accessibility).
        default: 'h-11 px-[22px] has-[>svg]:px-5',
        lg: 'h-12 px-7 text-[17px] has-[>svg]:px-6',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner, sets aria-busy and disables the button. */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
