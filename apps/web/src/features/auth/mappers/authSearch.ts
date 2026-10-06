import { emailSchema, safeRedirectPath } from '@borneo/shared';

/** Search params shared by the sign-in, sign-up and reset pages. Only same-site redirects survive. */
export type AuthSearch = { redirect?: string; email?: string; reset?: true };

export function parseAuthSearch(raw: Record<string, unknown>): AuthSearch {
  const out: AuthSearch = {};
  if (typeof raw.redirect === 'string') {
    const target = safeRedirectPath(raw.redirect, '');
    if (target) out.redirect = target;
  }
  const email = emailSchema.safeParse(raw.email);
  if (email.success) out.email = email.data;
  if (raw.reset === true || raw.reset === 'true' || raw.reset === 1) out.reset = true;
  return out;
}

/** Where to go once signed in. */
export const afterSignIn = (search: AuthSearch) => safeRedirectPath(search.redirect, '/account');
