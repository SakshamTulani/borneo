import { useId } from 'react';
import { cn } from '@/shared/lib/utils';
import { toggleOption } from '../mappers/listingSearch';
import type { FilterControl, ListingSearch } from '../model';

type Props = {
  controls: FilterControl[];
  priceOptions: { value: string; label: string }[];
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
};

const fieldset = 'space-y-1 border-t border-line pt-4 first:border-t-0 first:pt-0';
const legend = 'mb-2 font-heading text-sm font-semibold';
const select =
  'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand';

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm hover:bg-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-5 shrink-0 accent-brand"
      />
      {label}
    </label>
  );
}

/** Config-driven filters (D-18). Every change goes to the URL through `onSearchChange`. */
export function FilterPanel({ controls, priceOptions, search, onSearchChange }: Props) {
  const id = useId();
  return (
    <div className="space-y-4">
      {priceOptions.length ? (
        <div className={fieldset}>
          <label htmlFor={`${id}-price`} className={cn(legend, 'block')}>
            Price
          </label>
          <select
            id={`${id}-price`}
            className={select}
            value={search.maxPrice ? String(search.maxPrice) : ''}
            onChange={(e) =>
              onSearchChange({
                ...search,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">Any price</option>
            {priceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {controls.map((c) => {
        switch (c.kind) {
          case 'anyOf':
            return (
              <fieldset key={c.key} className={fieldset}>
                <legend className={legend}>{c.label}</legend>
                {c.options.map((o) => (
                  <Check
                    key={o.value}
                    label={o.label}
                    checked={o.checked}
                    onChange={() => onSearchChange(toggleOption(search, c.key, o.value))}
                  />
                ))}
              </fieldset>
            );
          case 'isTrue':
            return (
              <div key={c.key} className={fieldset}>
                <Check
                  label={c.label}
                  checked={c.checked}
                  onChange={() =>
                    onSearchChange({ ...search, [c.key]: c.checked ? undefined : true })
                  }
                />
              </div>
            );
          case 'atLeast':
            return (
              <div key={c.key} className={fieldset}>
                <label htmlFor={`${id}-${c.key}`} className={cn(legend, 'block')}>
                  {c.label}
                </label>
                <select
                  id={`${id}-${c.key}`}
                  className={select}
                  value={c.value}
                  onChange={(e) =>
                    onSearchChange({
                      ...search,
                      [c.key]: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Any</option>
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            );
        }
      })}
    </div>
  );
}
