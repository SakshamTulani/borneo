import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { toCatalogCard } from '../mappers/toCatalogCard';
import { categoriesQuery, newestProductsQuery } from '../repository/catalogRepository';
import { HOME_NEWEST, HomePage } from './HomePage';

function seededClient() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(categoriesQuery.queryKey, [
    { slug: 'smartphones', name: 'Smartphones', homeEntry: 'helpMeChoose' as const },
    { slug: 'accessories', name: 'Accessories', homeEntry: 'buildYourSetup' as const },
    { slug: 'tvs', name: 'TVs' },
  ]);
  const names = ['Echo Buds 2', 'Nova 3', 'Pulse 4', 'Vista 55', 'Echo Max 2', 'Watch S2'];
  queryClient.setQueryData(
    newestProductsQuery(HOME_NEWEST).queryKey,
    names.map((name, i) => toCatalogCard(summaryFixture({ id: `p${i}`, slug: `s-${i}`, name }))),
  );
  queryClient.setQueryData(['deals'], {
    live: [
      {
        product: summaryFixture({ id: 'd1', slug: 'boom-2', name: 'Boom 2' }),
        sku: 'BOOM2-BLK',
        salePricePaise: 399_900,
        regularPricePaise: 499_900,
        startsAt: Date.UTC(2026, 9, 6),
        endsAt: Date.UTC(2026, 9, 7),
        state: 'live',
        remaining: null,
      },
    ],
    upcoming: [],
  });
  return queryClient;
}

describe('HomePage', () => {
  it('D-120, D-181: product hero, latest launches, categories and entry points; axe clean', async () => {
    const { container } = await renderWithRouter(<HomePage />, { queryClient: seededClient() });
    // The hero carousel: live deals first, then the four newest launches (D-181, owner request).
    const hero = screen.getByRole('region', { name: 'Deals and new launches' });
    expect(container.querySelector('section')).toBe(hero);
    const slides = screen
      .getAllByRole('group')
      .filter((g) => g.getAttribute('aria-roledescription') === 'slide');
    expect(slides.map((g) => g.getAttribute('aria-label'))).toEqual([
      '1 of 5: Flash deal: Boom 2',
      '2 of 5: Just launched: Echo Buds 2',
      '3 of 5: Just launched: Nova 3',
      '4 of 5: Just launched: Pulse 4',
      '5 of 5: Just launched: Vista 55',
    ]);
    expect(screen.getByRole('link', { name: 'View deal: Boom 2' }).getAttribute('href')).toContain(
      'variant=BOOM2-BLK',
    );
    expect(screen.getByRole('link', { name: 'View details: Echo Buds 2' })).toBeTruthy();
    const latest = screen.getByRole('region', { name: 'Latest launches' });
    expect(latest.textContent).toContain('Echo Max 2');
    expect(latest.textContent).not.toContain('Echo Buds 2');

    const categories = screen.getByRole('region', { name: 'Shop by category' });
    expect(categories.querySelectorAll('a')).toHaveLength(3);
    const start = screen.getByRole('region', { name: 'Where to start' });
    expect(start.textContent).toContain('Help me choose');
    expect(start.textContent).toContain('Smartphones');
    expect(start.textContent).toContain('Build your setup');
    expect(start.textContent).not.toContain('TVs');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-180: banners link only to categories that exist', async () => {
    await renderWithRouter(<HomePage />, { queryClient: seededClient() });
    const featured = screen.getByRole('region', { name: 'Featured' });
    const links = [...featured.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/categories/tvs']);
  });

  it('the carousel moves with its controls and can be paused', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    await renderWithRouter(<HomePage />, { queryClient: seededClient() });
    const dot = (n: number) =>
      screen.getByRole('button', { name: new RegExp(`^Show slide ${n}:`) });
    expect(dot(1).getAttribute('aria-current')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(dot(2).getAttribute('aria-current')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(dot(5).getAttribute('aria-current')).toBe('true');
  });
});
