import { Link } from '@tanstack/react-router';
import { ScaleIcon, XIcon } from 'lucide-react';
import { COMPARE_MAX } from '@borneo/shared';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import type { CompareControl } from '../model';

/**
 * The compare selection, pinned above the bottom nav (D-122, D-227). Opens the compare page with
 * the selection in its URL; never adds or drops anything by itself.
 */
export function CompareTray({
  categorySlug,
  compare,
}: {
  categorySlug: string;
  compare: CompareControl;
}) {
  const n = compare.selected.length;
  return (
    <div
      role="region"
      aria-label="Compare"
      className="fixed inset-x-0 bottom-16 z-20 px-4 lg:bottom-6"
    >
      <div className="mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-surface/95 py-2 pr-2 pl-5 shadow-lg backdrop-blur">
        <p className="text-sm" aria-live="polite">
          {compare.message ?? (
            <>
              <strong>{n}</strong> of {COMPARE_MAX} chosen
              {n < 2 ? ': choose one more' : ''}
            </>
          )}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Clear compare" onClick={compare.onClear}>
            <XIcon aria-hidden />
          </Button>
          {n >= 2 ? (
            <Link
              to="/compare/$category"
              params={{ category: categorySlug }}
              search={{ p: compare.selected.join(',') }}
              className={buttonVariants()}
            >
              <ScaleIcon aria-hidden />
              Compare {n}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
