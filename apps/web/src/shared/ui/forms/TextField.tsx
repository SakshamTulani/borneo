import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';

type Props = ComponentProps<'input'> & {
  label: string;
  /** Shown under the field; announced with it. */
  hint?: ReactNode;
  /** Replaces the hint and marks the field invalid. */
  error?: string | undefined;
  /** Shown after the label, e.g. "Optional". */
  aside?: string;
  /** Extra control inside the field row (e.g. show password). */
  trailing?: ReactNode;
};

/** Label, input, hint and error wired together for screen readers. Works with RHF `register`. */
export function TextField({ label, hint, error, aside, trailing, id, className, ...input }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const note = error ?? hint;
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId}>
        {label}
        {aside ? <span className="font-normal text-ink-muted">{aside}</span> : null}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={trailing ? 'pr-14' : undefined}
          {...input}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {note ? (
        <p id={noteId} className={cn('text-sm', error ? 'text-danger' : 'text-ink-muted')}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
