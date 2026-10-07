import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { CompareView } from '@borneo/shared';
import { stubApi } from '@/test/api';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { ComparePage } from './ComparePage';

afterEach(() => vi.unstubAllGlobals());

const names = ['Buds 2', 'Buds 2 Pro', 'Max 2', 'Band 1'];
const view: CompareView = {
  category: { slug: 'audio', name: 'Audio' },
  products: names.map((name, i) => summaryFixture({ id: `p${i}`, slug: `s${i}`, name })),
  rows: [
    {
      key: 'anc',
      label: 'Active noise cancellation',
      values: ['Yes', 'Yes', 'Yes', 'Yes'],
      differs: false,
    },
    {
      key: 'playback_hours',
      label: 'Playback',
      values: ['8 h', '9 h', '50 h', null],
      differs: true,
    },
  ],
};
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('ComparePage', () => {
  it('D-227: rows side by side, missing values "Not stated", differences only on request; axe clean', async () => {
    stubApi({ 'GET /compare': [200, view] });
    const { container } = await renderWithRouter(
      <ComparePage category="audio" slugs={['s0', 's1', 's2', 's3']} onChange={() => {}} />,
      { queryClient: qc() },
    );
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    expect(within(table).getByText('Not stated')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByLabelText('Only differences'));
    expect(within(table).queryByText('Active noise cancellation')).toBeNull();
    expect(within(table).getByText('Playback')).toBeTruthy();
  });

  it('D-122: the fourth column is desktop only, with a note on mobile', async () => {
    stubApi({ 'GET /compare': [200, view] });
    await renderWithRouter(
      <ComparePage category="audio" slugs={['s0', 's1', 's2', 's3']} onChange={() => {}} />,
      { queryClient: qc() },
    );
    const headers = within(await screen.findByRole('table')).getAllByRole('columnheader');
    expect(headers[3]!.className).toContain('hidden sm:table-cell');
    expect(headers[2]!.className).not.toContain('hidden');
    expect(screen.getByText(/Showing the first 3 on this screen/)).toBeTruthy();
  });

  it('D-227: removing a product updates the selection; fewer than two asks for more', async () => {
    const onChange = vi.fn();
    stubApi({ 'GET /compare': [200, view] });
    await renderWithRouter(
      <ComparePage category="audio" slugs={['s0', 's1', 's2', 's3']} onChange={onChange} />,
      { queryClient: qc() },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Max 2' }));
    expect(onChange).toHaveBeenCalledWith(['s0', 's1', 's3']);
    vi.unstubAllGlobals();
    stubApi({ 'GET /compare': [200, { ...view, products: view.products.slice(0, 1) }] });
    await renderWithRouter(<ComparePage category="audio" slugs={['s0']} onChange={() => {}} />, {
      queryClient: qc(),
    });
    expect(await screen.findByText('Choose at least two to compare')).toBeTruthy();
  });
});
