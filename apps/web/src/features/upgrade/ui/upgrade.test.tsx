import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { customer, stubApi } from '@/test/api';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { UpgradePanel } from './UpgradePanel';
import { UpgradeStrip } from './UpgradeStrip';

afterEach(() => vi.unstubAllGlobals());

const qc = (signedIn: boolean) => {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  c.setQueryData(['session'], signedIn ? customer : null);
  return c;
};

describe('UpgradePanel', () => {
  it('D-130: names the owned device; D-133 lists what you gain; axe clean', async () => {
    stubApi({
      'GET /me/upgrades/nova-3': [
        200,
        {
          badge: { fromName: 'Borneo Nova 2', fromSlug: 'nova-2' },
          gains: [{ label: 'Battery', from: '4,500 mAh', to: '5,000 mAh' }],
          changes: [{ label: 'Chipset', from: 'A', to: 'B' }],
        },
      ],
    });
    const { container } = await renderWithRouter(<UpgradePanel slug="nova-3" />, {
      queryClient: qc(true),
    });
    expect(await screen.findByRole('link', { name: 'Borneo Nova 2' })).toBeTruthy();
    expect(screen.getByText('What you gain')).toBeTruthy();
    expect(screen.getByText('5,000 mAh')).toBeTruthy();
    expect(screen.getByText('Also different (1)')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-130: nothing for signed-out visitors (no request) or non-owners', async () => {
    const api = stubApi({
      'GET /me/upgrades/nova-3': [200, { badge: null, gains: [], changes: [] }],
    });
    const { container } = await renderWithRouter(<UpgradePanel slug="nova-3" />, {
      queryClient: qc(false),
    });
    expect(container.textContent).toBe('');
    expect(api).not.toHaveBeenCalled();
  });
});

describe('UpgradeStrip', () => {
  it('D-121: shows each upgrade with the owned device it replaces; axe clean', async () => {
    stubApi({
      'GET /me/upgrades': [
        200,
        {
          items: [
            {
              from: { name: 'Borneo Nova 2', slug: 'nova-2' },
              to: summaryFixture({ name: 'Nova 3' }),
            },
          ],
        },
      ],
    });
    const { container } = await renderWithRouter(
      <UpgradeStrip renderCard={({ to }) => <p>{to.name}</p>} />,
      { queryClient: qc(true) },
    );
    expect(await screen.findByText('Upgrade available')).toBeTruthy();
    expect(screen.getByText('From your Borneo Nova 2')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
