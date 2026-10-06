import { ChevronRightIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

/** Trail of links; the last item is the current page (plain text, aria-current). */
export function Breadcrumbs({ items }: { items: { key: string; node: ReactNode }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={item.key}>
              <li
                className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:underline-offset-4 [&_a]:hover:text-ink [&_a]:hover:underline"
                {...(last ? { 'aria-current': 'page' as const } : {})}
              >
                {item.node}
              </li>
              {last ? null : (
                <li aria-hidden className="flex">
                  <ChevronRightIcon className="size-4" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
