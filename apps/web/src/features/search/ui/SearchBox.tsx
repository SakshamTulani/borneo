import { useNavigate } from '@tanstack/react-router';
import { ImageIcon, LayoutGridIcon, SearchIcon } from 'lucide-react';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/utils';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { MIN_SUGGEST_LENGTH, useSearchSuggestionsQuery } from '../hooks/useSearchSuggestionsQuery';
import type { Suggestion } from '../model';

/**
 * Header search with instant suggestions (D-112): an ARIA combobox. Arrow keys move through
 * categories and products, Enter opens the active one or the results page (where an exact
 * model name or SKU jumps straight to the product, D-110), Escape closes.
 */
export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const listId = useId();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const q = useDebouncedValue(value.trim(), 150);
  const { data: suggestions = [] } = useSearchSuggestionsQuery(q);
  const showList = open && value.trim().length >= MIN_SUGGEST_LENGTH && suggestions.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;
  // One extra row at the end: "See all results".
  const rows = suggestions.length + 1;

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function go(s: Suggestion) {
    close();
    setValue('');
    if (s.kind === 'category') void navigate({ to: '/categories/$slug', params: { slug: s.slug } });
    else void navigate({ to: '/products/$slug', params: { slug: s.slug } });
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const term = value.trim();
    if (!term) return;
    close();
    void navigate({ to: '/search', search: { q: term } });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && showList) {
      e.preventDefault();
      setActive((i) => (i + 1) % rows);
    } else if (e.key === 'ArrowUp' && showList) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows - 1 : i - 1));
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Enter' && showList && active >= 0 && active < suggestions.length) {
      e.preventDefault();
      go(suggestions[active]!);
    }
  }

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search Borneo
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        // Only on the dedicated search page, where typing is the one thing to do.
        autoFocus={autoFocus}
        placeholder="Search phones, earbuds, model or SKU"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-full bg-muted pr-4 pl-10 text-[15px] text-ink outline-none placeholder:text-ink-muted focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-search-cancel-button]:hidden"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        {suggestions.map((s, i) => (
          <li
            key={s.id}
            id={optionId(i)}
            role="option"
            aria-selected={active === i}
            // Keep focus in the input so blur doesn't close the list before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(s)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-1.5',
              active === i && 'bg-muted',
            )}
          >
            {s.kind === 'category' ? (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <LayoutGridIcon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-ink-muted">Category</span>
                </span>
              </>
            ) : (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {s.image ? (
                    <img
                      src={s.image.src}
                      {...(s.image.srcSet ? { srcSet: s.image.srcSet, sizes: '40px' } : {})}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="size-4 text-line-strong" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-ink-muted">
                    <span className="font-semibold text-ink tabular-nums">{s.priceLabel}</span>
                    {' · '}
                    {s.stockLabel}
                  </span>
                </span>
              </>
            )}
          </li>
        ))}
        <li
          id={optionId(suggestions.length)}
          role="option"
          aria-selected={active === suggestions.length}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => submit()}
          onMouseEnter={() => setActive(suggestions.length)}
          className={cn(
            'flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-2.5 text-sm text-brand',
            active === suggestions.length && 'bg-muted',
          )}
        >
          <SearchIcon className="size-4" aria-hidden />
          See all results for “{value.trim()}”
        </li>
      </ul>
    </form>
  );
}
