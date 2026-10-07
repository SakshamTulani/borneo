import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

/**
 * Page-level accessibility audit (Phase O): axe over the real server-rendered HTML of every main
 * page, signed out and signed in. Needs `pnpm dev` running; skipped otherwise. Run with
 * `pnpm --filter @borneo/web audit:a11y` (AUDIT_URL defaults to the dev server).
 * jsdom can't judge colour contrast or layout: tokens.test.ts covers contrast.
 */
const base = process.env.AUDIT_URL;

const PUBLIC = [
  '/',
  '/categories',
  '/categories/smartphones',
  '/categories/audio?compare=echo-buds-2,echo-buds-2-pro',
  '/products/pulse-4',
  '/products/echo-buds-2',
  '/search?q=earbuds',
  '/finder/phones',
  '/finder/audio?type=tws&use=commute&budget=any',
  '/compare/audio?p=echo-buds-2,echo-buds-2-pro,echo-max-2',
  '/deals',
  '/help',
  '/cart',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
];
const ACCOUNT = [
  '/account',
  '/account/orders',
  '/account/returns',
  '/account/devices',
  '/account/reviews',
  '/account/wishlist',
  '/account/watch',
  '/account/addresses',
  '/account/profile',
  '/account/inbox',
  '/checkout',
];

let cookie = '';

async function audit(path: string) {
  const res = await fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });
  expect(res.status, path).toBe(200);
  const html = await res.text();
  // Scripts don't run: what axe sees is exactly what the server sent.
  document.documentElement.innerHTML = html
    .replace(/^[\s\S]*?<html[^>]*>/i, '')
    .replace(/<\/html>[\s\S]*$/i, '');
  const results = await axe(document.documentElement, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const problems = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  );
  expect(problems, path).toEqual([]);
}

describe.skipIf(!base)('page audit', () => {
  beforeAll(async () => {
    const res = await fetch(`${base}/api/auth/sign-up`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base! },
      body: JSON.stringify({
        name: 'Audit Shopper',
        email: `audit${Date.now()}@example.com`,
        phone: '9876543210',
        password: 'password123',
      }),
    });
    cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  });
  afterAll(() => {
    cookie = '';
  });

  it.each(PUBLIC)('signed out: %s', async (path) => {
    const saved = cookie;
    cookie = '';
    try {
      await audit(path);
    } finally {
      cookie = saved;
    }
  });

  it.each(ACCOUNT)('signed in: %s', audit);
});
