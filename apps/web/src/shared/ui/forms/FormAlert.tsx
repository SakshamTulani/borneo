import { AlertCircleIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** A problem with the whole form (e.g. wrong password), announced when it appears. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
