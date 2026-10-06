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
  ]);
  return queryClient;
}

describe('HomePage', () => {
  it('D-120: categories, config-driven entry points and new launches; axe clean', async () => {
    const { container } = await renderWithRouter(<HomePage />, { queryClient: seededClient() });
    const categories = screen.getByRole('region', { name: 'Shop by category' });
    expect(categories.querySelectorAll('a')).toHaveLength(3);
    const start = screen.getByRole('region', { name: 'Where to start' });
    expect(start.textContent).toContain('Help me choose');
    expect(start.textContent).toContain('Smartphones');
    expect(start.textContent).toContain('Build your setup');
    expect(start.textContent).not.toContain('TVs');
    expect(screen.getByRole('link', { name: 'Echo Buds 2' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
