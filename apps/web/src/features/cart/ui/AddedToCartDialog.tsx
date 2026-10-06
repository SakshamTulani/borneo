import { Link } from '@tanstack/react-router';
import { CheckCircle2Icon } from 'lucide-react';
import { formatInr } from '@borneo/shared';
import { buttonVariants } from '@/shared/ui/base/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/base/dialog';
import { optionsText } from '../mappers/cartText';
import type { CartAddResult } from '../model';
import { SuggestionList } from './SuggestionList';

type Props = { result: CartAddResult | null; onClose: () => void };

/** Add-to-cart confirmation with up to 3 add-on suggestions (D-123, D-124, D-199). */
export function AddedToCartDialog({ result, onClose }: Props) {
  const line = result?.cart.lines.find((l) => l.key === result.added.key);
  return (
    <Dialog open={!!result} onOpenChange={(open) => (open ? null : onClose())}>
      {result && line ? (
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-success" aria-hidden />
            Added to your cart
          </DialogTitle>
          <DialogDescription>
            {line.name}
            {line.product && Object.keys(line.product.options).length
              ? ` (${optionsText(line.product.options)})`
              : ''}
            {line.qty > 1 ? `, ${line.qty} in your cart` : ''}. Cart total{' '}
            <span className="font-semibold text-ink tabular-nums">
              {formatInr(result.cart.totalPaise)}
            </span>
            .
          </DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/cart" className={buttonVariants()} onClick={onClose}>
              View cart
            </Link>
            <DialogClose className={buttonVariants({ variant: 'ghost' })}>
              Keep shopping
            </DialogClose>
          </div>
          {result.added.suggestions.length ? (
            <section
              aria-labelledby="added-suggestions"
              className="space-y-3 border-t border-line pt-4"
            >
              <h3 id="added-suggestions" className="font-semibold">
                Goes well with it
              </h3>
              <SuggestionList suggestions={result.added.suggestions} layout="list" />
            </section>
          ) : null}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
