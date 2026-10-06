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
  queryClient.setQueryData(newestProductsQuery(HOME_NEWEST).queryKey, [
    toCatalogCard(summaryFixture()),
    toCatalogCard(summaryFixture({ id: 'p-max', slug: 'echo-max-2', name: 'Echo Max 2' })),
  ]);
  return queryClient;
}

describe('HomePage', () => {
  it('D-120, D-181: product hero, latest launches, categories and entry points; axe clean', async () => {
    const { container } = await renderWithRouter(<HomePage />, { queryClient: seededClient() });
    // The hero is the newest product, not a slogan (D-181); the next launches follow.
    const hero = screen.getByRole('region', { name: 'Echo Buds 2' });
    expect(container.querySelector('section')).toBe(hero);
    expect(hero.textContent).toContain('Just launched');
    expect(screen.getByRole('link', { name: 'View details of the Echo Buds 2' })).toBeTruthy();
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
});
