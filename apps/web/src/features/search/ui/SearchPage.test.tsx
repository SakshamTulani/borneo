import type { SearchResult } from '@borneo/shared';
import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { toSearchView } from '../mappers/toSearchView';
import { searchResultsQuery } from '../repository/searchRepository';
import { SearchPage } from './SearchPage';

function client(r: SearchResult) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(searchResultsQuery(r.query).queryKey, toSearchView(r));
  return queryClient;
}

const phonesUnder = (over: Partial<SearchResult>): SearchResult => ({
  query: 'phone under 30000',
  exactMatch: null,
  interpretation: {
    text: 'phone',
    maxPricePaise: 3_000_000,
    category: { slug: 'smartphones', name: 'Smartphones' },
  },
  categories: [{ slug: 'smartphones', name: 'Smartphones' }],
  products: [],
  fallback: null,
  ...over,
});

describe('SearchPage', () => {
  it('D-113: shows results with the reading of the query and a link to all filters; axe clean', async () => {
    const r = phonesUnder({
      products: [summaryFixture({ name: 'Borneo Pulse 4', slug: 'pulse-4' })],
    });
    const { container } = await renderWithRouter(<SearchPage q={r.query} />, {
      queryClient: client(r),
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Results for “phone under 30000”',
    );
    expect(screen.getByRole('status').textContent).toBe('1 product · Smartphones under ₹30,000');
    expect(screen.getByRole('link', { name: 'Refine with all filters' }).getAttribute('href')).toBe(
      '/categories/smartphones?maxPrice=30000',
    );
    expect(screen.getByRole('link', { name: 'Borneo Pulse 4' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-114: no results offers same-category alternatives, categories and browse all', async () => {
    const r = phonesUnder({
      query: 'phones under 5000',
      fallback: {
        alternatives: [summaryFixture({ name: 'Borneo Nova 2', slug: 'nova-2' })],
        categories: [
          { slug: 'smartphones', name: 'Smartphones' },
          { slug: 'audio', name: 'Audio' },
        ],
      },
    });
    const { container } = await renderWithRouter(<SearchPage q={r.query} />, {
      queryClient: client(r),
    });
    expect(
      screen.getByRole('heading', { name: 'No smartphones under ₹30,000 right now' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Smartphones you can buy today' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Borneo Nova 2' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Popular categories' }).textContent).toContain('Audio');
    expect(screen.getByRole('link', { name: 'Browse all categories' })).toBeTruthy();
    // No "tell us what you wanted" capture for products we don't stock.
    expect(container.querySelector('form')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('without a query, offers one search box ready to type; axe clean', async () => {
    const { container } = await renderWithRouter(<SearchPage q="" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Search');
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
