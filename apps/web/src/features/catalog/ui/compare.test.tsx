import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { toCatalogCard } from '../mappers/toCatalogCard';
import { CompareTray } from './CompareTray';
import { ProductGrid } from './ProductGrid';

const cards = ['a', 'b'].map((s) =>
  toCatalogCard(summaryFixture({ id: s, slug: s, name: `Phone ${s}` })),
);

describe('compare on listings', () => {
  it('D-227: each card has a Compare checkbox reflecting the URL selection; axe clean', async () => {
    const onToggle = vi.fn();
    const { container } = await renderWithRouter(
      <ProductGrid
        cards={cards}
        compare={{ selected: ['a'], onToggle, onClear: () => {}, message: null }}
      />,
    );
    expect((screen.getByLabelText('Compare Phone a') as HTMLInputElement).checked).toBe(true);
    await userEvent.click(screen.getByLabelText('Compare Phone b'));
    expect(onToggle).toHaveBeenCalledWith('b');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-122: the tray links to the compare page from two, and says why a fifth was refused', async () => {
    const control = { selected: ['a', 'b'], onToggle: () => {}, onClear: vi.fn(), message: null };
    const { container, unmount } = await renderWithRouter(
      <CompareTray categorySlug="smartphones" compare={control} />,
    );
    expect(screen.getByRole('link', { name: 'Compare 2' }).getAttribute('href')).toBe(
      '/compare/smartphones?p=a%2Cb',
    );
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    await renderWithRouter(
      <CompareTray
        categorySlug="smartphones"
        compare={{ ...control, message: 'You can compare up to 4. Remove one to add another.' }}
      />,
    );
    expect(screen.getByText('You can compare up to 4. Remove one to add another.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Clear compare' }));
    expect(control.onClear).toHaveBeenCalled();
  });
});
