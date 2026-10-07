import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { toSuggestions } from '../mappers/toSearchView';
import { searchSuggestionsQuery } from '../repository/searchRepository';
import { SearchBox } from './SearchBox';

function seeded() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    searchSuggestionsQuery('echo').queryKey,
    toSuggestions({
      query: 'echo',
      exactMatch: null,
      interpretation: { text: 'echo' },
      categories: [{ slug: 'audio', name: 'Audio' }],
      products: [summaryFixture()],
      total: 1,
      nextCursor: null,
      fallback: null,
    }),
  );
  return queryClient;
}

async function typeEcho() {
  const result = await renderWithRouter(<SearchBox />, { queryClient: seeded() });
  const input = screen.getByRole('combobox', { name: 'Search Borneo' });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'echo' } });
  await screen.findByRole('option', { name: /Echo Buds 2/ });
  return { ...result, input };
}

describe('SearchBox', () => {
  it('D-112: suggests categories and products with price and stock; axe clean', async () => {
    const { container, input } = await typeEcho();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options[0]).toContain('Audio');
    expect(options[1]).toContain('₹3,499');
    expect(options[1]).toContain('In stock');
    expect(options.at(-1)).toContain('See all results for “echo”');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('arrow keys move the active option; Enter opens it', async () => {
    const { input, router } = await typeEcho();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = input.getAttribute('aria-activedescendant')!;
    expect(document.getElementById(active)?.textContent).toContain('Echo Buds 2');
    fireEvent.keyDown(input, { key: 'Enter' });
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/products/echo-buds-2'));
  });

  it('D-110: submitting goes to the results page, which opens exact matches', async () => {
    const { input, router } = await typeEcho();
    fireEvent.submit(input.closest('form')!);
    await vi.waitFor(() => expect(router.state.location.href).toBe('/search?q=echo'));
  });

  it('Escape closes the list', async () => {
    const { input } = await typeEcho();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
