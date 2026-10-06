import { useId, type ReactNode } from 'react';
import { Select } from '@/shared/ui/base/select';
import { toggleOption } from '../mappers/listingSearch';
import type { FilterControl, ListingSearch } from '../model';

type Props = {
  controls: FilterControl[];
  priceOptions: { value: string; label: string }[];
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
};

const heading = 'mb-2 block text-sm font-semibold';

/** One filter group. The divider is on this wrapper, never on a fieldset (its legend would cut the line). */
function Group({ children }: { children: ReactNode }) {
  return <div className="border-t border-line py-4 first:border-t-0 first:pt-0">{children}</div>;
}

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
    <label className="-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 text-[15px] hover:bg-canvas">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-[18px] shrink-0 cursor-pointer rounded accent-brand"
      />
      {label}
    </label>
  );
}

/** Config-driven filters (D-18). Every change goes to the URL through `onSearchChange`. */
export function FilterPanel({ controls, priceOptions, search, onSearchChange }: Props) {
  const id = useId();
  return (
    <div>
      {priceOptions.length ? (
        <Group>
          <label htmlFor={`${id}-price`} className={heading}>
            Price
          </label>
          <Select
            id={`${id}-price`}
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
          </Select>
        </Group>
      ) : null}
      {controls.map((c) => {
        switch (c.kind) {
          case 'anyOf':
            return (
              <Group key={c.key}>
                <fieldset>
                  <legend className={heading}>{c.label}</legend>
                  {c.options.map((o) => (
                    <Check
                      key={o.value}
                      label={o.label}
                      checked={o.checked}
                      onChange={() => onSearchChange(toggleOption(search, c.key, o.value))}
                    />
                  ))}
                </fieldset>
              </Group>
            );
          case 'isTrue':
            return (
              <Group key={c.key}>
                <Check
                  label={c.label}
                  checked={c.checked}
                  onChange={() =>
                    onSearchChange({ ...search, [c.key]: c.checked ? undefined : true })
                  }
                />
              </Group>
            );
          case 'atLeast':
            return (
              <Group key={c.key}>
                <label htmlFor={`${id}-${c.key}`} className={heading}>
                  {c.label}
                </label>
                <Select
                  id={`${id}-${c.key}`}
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
                </Select>
              </Group>
            );
        }
      })}
    </div>
  );
}
