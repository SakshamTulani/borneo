/** Password length bounds (D-97). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Reset codes: 6 digits, valid 10 minutes, 3 tries (D-98). */
export const RESET_CODE_LENGTH = 6;
export const RESET_CODE_TTL_SECONDS = 10 * 60;
export const RESET_CODE_ATTEMPTS = 3;

/**
 * An Indian mobile number as 10 digits (D-99). Spaces, dashes, a leading 0 or +91/91 are
 * dropped; the number must start with 6–9. Returns null when it isn't one.
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9][0-9]{9}$/.test(digits) ? digits : null;
}

/**
 * Where to go after signing in: only a path on this site, never another origin (no open
 * redirects). Anything else falls back to `fallback`.
 */
export function safeRedirectPath(target: unknown, fallback = '/account'): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return fallback;
  // Browsers drop tabs and newlines in URLs ("/\t/evil" becomes "//evil"): refuse any control char.
  const unsafe = [...target].some(
    (c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f || c === '\\',
  );
  if (unsafe) return fallback;
  let url: URL;
  try {
    url = new URL(target, 'https://same.invalid');
  } catch {
    return fallback;
  }
  if (url.origin !== 'https://same.invalid') return fallback;
  return url.pathname + url.search + url.hash;
}
