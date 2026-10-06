import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { toCatalogCard } from '../mappers/toCatalogCard';
import type { FilterControl } from '../model';
import { CategoryView, type CategoryViewProps } from './CategoryView';

const controls: FilterControl[] = [
  {
    kind: 'anyOf',
    key: 'form_factor',
    label: 'Type',
    options: [
      { value: 'tws', label: 'True wireless', checked: true },
      { value: 'over_ear', label: 'Over-ear', checked: false },
    ],
  },
  { kind: 'isTrue', key: 'anc', label: 'Active noise cancellation', checked: false },
  {
    kind: 'atLeast',
    key: 'playback_hours',
    label: 'Playback',
    value: '',
    options: [{ value: '30', label: '30 h or more' }],
  },
];

function view(over: Partial<CategoryViewProps> = {}) {
  const onSearchChange = vi.fn();
  const props: CategoryViewProps = {
    category: { slug: 'audio', name: 'Audio' },
    controls,
    priceOptions: [{ value: '5000', label: 'Up to ₹5,000' }],
    activeFilters: [{ key: 'form_factor:tws', label: 'True wireless', remove: {} }],
    search: { form_factor: 'tws' },
    onSearchChange,
    list: {
      status: 'success',
      cards: [toCatalogCard(summaryFixture())],
      hasMore: true,
      loadingMore: false,
      onLoadMore: () => {},
    },
    ...over,
  };
  return { props, onSearchChange };
}

describe('CategoryView', () => {
  it('lists products with filters, sort and applied chips; axe clean', async () => {
    const { props } = view();
    const { container } = await renderWithRouter(<CategoryView {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Audio' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Showing 1 product');
    expect(screen.getByRole('link', { name: 'Echo Buds 2' }).getAttribute('href')).toBe(
      '/products/echo-buds-2',
    );
    expect(screen.getByRole('button', { name: 'Show more products' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-18: every filter change goes to the URL search', async () => {
    const { props, onSearchChange } = view();
    await renderWithRouter(<CategoryView {...props} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Over-ear' }));
    expect(onSearchChange).toHaveBeenLastCalledWith({ form_factor: 'tws,over_ear' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active noise cancellation' }));
    expect(onSearchChange).toHaveBeenLastCalledWith({ form_factor: 'tws', anc: true });
    fireEvent.change(screen.getByLabelText('Playback'), { target: { value: '30' } });
    expect(onSearchChange).toHaveBeenLastCalledWith({ form_factor: 'tws', playback_hours: 30 });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '5000' } });
    expect(onSearchChange).toHaveBeenLastCalledWith({ form_factor: 'tws', maxPrice: 5000 });
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'price_asc' } });
    expect(onSearchChange).toHaveBeenLastCalledWith({ form_factor: 'tws', sort: 'price_asc' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter True wireless' }));
    expect(onSearchChange).toHaveBeenLastCalledWith({});
  });

  it('opens the filter panel on mobile with a disclosure button', async () => {
    const { props } = view();
    await renderWithRouter(<CategoryView {...props} />);
    const toggle = screen.getByRole('button', { name: 'Filters (1)' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows loading, error with retry, and a filtered empty state', async () => {
    const onRetry = vi.fn();
    const pending = await renderWithRouter(
      <CategoryView {...view({ list: { status: 'pending' } }).props} />,
    );
    expect(screen.getByRole('list', { name: 'Loading products' })).toBeTruthy();
    expect(await axe(pending.container)).toHaveNoViolations();
    pending.unmount();

    const failed = await renderWithRouter(
      <CategoryView {...view({ list: { status: 'error', onRetry } }).props} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await axe(failed.container)).toHaveNoViolations();
    failed.unmount();

    const { props, onSearchChange } = view({
      list: {
        status: 'success',
        cards: [],
        hasMore: false,
        loadingMore: false,
        onLoadMore: () => {},
      },
    });
    const empty = await renderWithRouter(<CategoryView {...props} />);
    expect(screen.getByText('No products match these filters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onSearchChange).toHaveBeenLastCalledWith({});
    expect(await axe(empty.container)).toHaveNoViolations();
  });
});
