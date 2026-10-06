import { isValidPincode } from '@borneo/shared';
import { useState, useSyncExternalStore } from 'react';

/** Browser-only memory of the last checked pincode (D-185). */
export const PINCODE_STORAGE_KEY = 'borneo.pincode';

/** Spaces and dashes typed or pasted ("560 001") are dropped; a pincode has 6 digits. */
const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 6);

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readSaved(): string | null {
  try {
    const v = window.localStorage.getItem(PINCODE_STORAGE_KEY);
    return v && isValidPincode(v) ? v : null;
  } catch {
    return null;
  }
}

function save(pincode: string) {
  try {
    window.localStorage.setItem(PINCODE_STORAGE_KEY, pincode);
  } catch {
    // Storage blocked (private mode): the check still works, it just isn't remembered.
  }
  listeners.forEach((l) => l());
}

/**
 * The pincode field and the pincode last submitted. The server renders no saved pincode, so
 * the server and first client render match; the saved one applies right after hydration.
 */
export function useDeliveryForm() {
  const saved = useSyncExternalStore(subscribe, readSaved, () => null);
  const [draft, setDraft] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  /** Returns true when the same pincode was submitted again (a retry). */
  const submit = (value: string = draft ?? saved ?? ''): boolean => {
    const next = digitsOnly(value);
    const same = next === (submitted ?? saved);
    setDraft(next);
    setSubmitted(next);
    if (isValidPincode(next)) save(next);
    return same;
  };

  return {
    input: draft ?? saved ?? '',
    setInput: (value: string) => setDraft(digitsOnly(value)),
    pincode: submitted ?? saved,
    submit,
  };
}
