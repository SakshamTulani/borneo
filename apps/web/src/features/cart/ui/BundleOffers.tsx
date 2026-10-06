import { useState } from 'react';
import { PackageIcon, PlusIcon } from 'lucide-react';
import { formatInr, type BundleOffer } from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { useAddToCartMutation } from '../hooks/useAddToCartMutation';
import { useCartQuery } from '../hooks/useCartQuery';
import { optionsText } from '../mappers/cartText';
import type { CartAddResult } from '../model';
import { AddedToCartDialog } from './AddedToCartDialog';
import { InCartControls } from './InCartControls';

/**
 * Fixed bundles with this product (D-38, D-197): the bundle price and the real saving against
 * the members' regular prices. One coupon rule: coupons don't apply to bundle prices (D-37).
 */
export function BundleOffers({ bundles }: { bundles: BundleOffer[] }) {
  const add = useAddToCartMutation();
  const [result, setResult] = useState<CartAddResult | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const cartLines = useCartQuery().data?.lines ?? [];
  if (bundles.length === 0) return null;

  return (
    <section aria-labelledby="pdp-bundles" className="space-y-4">
      <h2 id="pdp-bundles" className="font-heading text-headline tracking-tight">
        Buy together
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {bundles.map((b) => (
          <li
            key={b.key}
            className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <PackageIcon className="mt-0.5 size-5 shrink-0 text-offer" aria-hidden />
              <div className="space-y-1">
                <h3 className="font-semibold">{b.name}</h3>
                <ul className="text-sm text-ink-muted">
                  {b.items.map((i) => (
                    <li key={i.sku} className="flex items-center gap-1">
                      <PlusIcon className="size-3" aria-hidden />
                      {i.qty > 1 ? `${i.qty} × ` : ''}
                      {i.name}
                      {Object.keys(i.options).length ? ` (${optionsText(i.options)})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-heading text-tagline font-semibold tabular-nums">
                  {formatInr(b.pricePaise)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-offer">{formatInr(b.savingPaise)} less</span>{' '}
                  <span className="text-ink-muted">
                    than buying separately (<del>{formatInr(b.separatePaise)}</del>)
                  </span>
                </p>
                <p className="text-xs text-ink-muted">Coupons don't apply to bundle prices.</p>
              </div>
              {(() => {
                const inCart = cartLines.find((l) => l.key === b.key);
                return inCart ? (
                  <InCartControls line={inCart} className="w-full" />
                ) : (
                  <Button
                    variant="outline"
                    loading={add.isPending && add.variables?.key === b.key}
                    aria-label={`Add bundle: ${b.name}`}
                    onClick={() => {
                      setError(null);
                      add.mutate(
                        { key: b.key, pincode: null },
                        {
                          onSuccess: setResult,
                          onError: (e) =>
                            setError({
                              key: b.key,
                              message: errorMessage(e),
                            }),
                        },
                      );
                    }}
                  >
                    Add bundle
                  </Button>
                );
              })()}
            </div>
            {error?.key === b.key ? (
              <p role="alert" className="text-sm text-danger">
                {error.message}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <AddedToCartDialog result={result} onClose={() => setResult(null)} />
    </section>
  );
}
