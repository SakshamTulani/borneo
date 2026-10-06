import { useState, type ComponentProps } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { TextField } from './TextField';

/** A password field with a show/hide toggle (easier on phones). */
export function PasswordField(props: Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'>) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label="Show password"
          className="flex size-11 items-center justify-center rounded-full text-ink-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          {shown ? (
            <EyeOffIcon className="size-5" aria-hidden />
          ) : (
            <EyeIcon className="size-5" aria-hidden />
          )}
        </button>
      }
    />
  );
}
