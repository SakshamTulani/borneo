import { describe, expect, it } from 'vitest';
import { Route as AccountRoute } from '../routes/account';
import { Route as AddressesRoute } from '../routes/account.addresses.index';
import { Route as InboxRoute } from '../routes/account.inbox';
import { Route as CategoriesRoute } from '../routes/categories.index';
import { Route as ForgotRoute } from '../routes/forgot-password';
import { Route as SignInRoute } from '../routes/sign-in';
import { Route as SignUpRoute } from '../routes/sign-up';
import { Route as CategoryRoute } from '../routes/categories.$slug';
import { Route as HomeRoute } from '../routes/index';
import { Route as ProductRoute } from '../routes/products.$slug';

// Each route's head(): title, description and one canonical URL (ARCHITECTURE §SEO).
type Head = { meta?: Record<string, unknown>[]; links?: Record<string, unknown>[] };
const head = (route: { options: { head?: unknown } }, ctx: unknown): Head =>
  (route.options.head as (c: unknown) => Head)(ctx);

const title = (h: Head) => h.meta?.find((m) => 'title' in m)?.title;
const canonical = (h: Head) => h.links?.find((l) => l.rel === 'canonical')?.href;
const description = (h: Head) => h.meta?.find((m) => m.name === 'description')?.content;

describe('route heads', () => {
  it('home', () => {
    const h = head(HomeRoute, {});
    expect(title(h)).toBe('Borneo');
    expect(canonical(h)).toBe('http://localhost:5173/');
    expect(description(h)).toBeTruthy();
  });

  it('all categories', () => {
    expect(canonical(head(CategoriesRoute, {}))).toBe('http://localhost:5173/categories');
  });

  it('D-18: a category page, filtered or not, has the category as its canonical URL', () => {
    const h = head(CategoryRoute, { loaderData: { name: 'Audio' }, params: { slug: 'audio' } });
    expect(title(h)).toBe('Audio · Borneo');
    expect(canonical(h)).toBe('http://localhost:5173/categories/audio');
    expect(description(h)).toContain('audio');
  });

  it('a product page is typed as a product with its own canonical URL', () => {
    const h = head(ProductRoute, {
      loaderData: { name: 'Borneo Pulse 4', description: 'A 120 Hz screen.' },
      params: { slug: 'pulse-4' },
    });
    expect(title(h)).toBe('Borneo Pulse 4 · Borneo');
    expect(description(h)).toBe('A 120 Hz screen.');
    expect(canonical(h)).toBe('http://localhost:5173/products/pulse-4');
    expect(h.meta).toContainEqual({ property: 'og:type', content: 'product' });
  });

  it('account and sign-in pages are never indexed and have no canonical URL', () => {
    for (const route of [
      AccountRoute,
      AddressesRoute,
      InboxRoute,
      SignInRoute,
      SignUpRoute,
      ForgotRoute,
    ]) {
      const h = head(route, {});
      expect(h.meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' });
      expect(canonical(h)).toBeUndefined();
    }
  });
});
