import { useId, type ComponentProps, type ReactNode } from 'react';

/** A native checkbox with a ≥ 44px label row. Never pre-ticked by us (D-06). */
export function CheckboxField({
  label,
  hint,
  ...input
}: Omit<ComponentProps<'input'>, 'type'> & { label: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-3 size-5 shrink-0 accent-brand outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...input}
      />
      <div>
        <label htmlFor={id} className="flex min-h-11 items-center text-[15px]">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
