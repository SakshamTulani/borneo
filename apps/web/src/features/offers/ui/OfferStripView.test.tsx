import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithRouter } from '@/test/router';
import { toOfferTile } from '../mappers/toOfferTile';
import { OfferStripView } from './OfferStripView';

const endsAt = Date.UTC(2026, 9, 7, 10, 37);
const tiles = [
  toOfferTile({
    kind: 'flash',
    id: 'f1',
    productName: 'Echo Buds 2',
    productSlug: 'echo-buds-2',
    sku: 'EB2-BLK',
    salePricePaise: 279_900,
    regularPricePaise: 449_900,
    endsAt,
  }),
  toOfferTile({
    kind: 'coupon',
    id: 'c1',
    name: '10% off audio, up to ₹1,000',
    code: 'AUDIO10',
    scoped: true,
    validTo: Date.UTC(2027, 0, 4),
  }),
  toOfferTile({
    kind: 'bank',
    id: 'b1',
    name: '10% instant discount with HDFC Bank cards',
    minOrderPaise: 1_500_000,
    scoped: false,
    validTo: Date.UTC(2027, 0, 4),
  }),
];

describe('OfferStripView', () => {
  it('D-191: shows each live offer with its real terms; a flash sale links to its variant', async () => {
    const { container } = await renderWithRouter(<OfferStripView offers={tiles} />);
    expect(screen.getByRole('heading', { name: 'Offers now' })).toBeTruthy();
    const flash = screen.getByRole('link', { name: /Echo Buds 2 at ₹2,799/ });
    expect(flash.getAttribute('href')).toBe('/products/echo-buds-2?variant=EB2-BLK');
    expect(flash.textContent).toContain('Usually ₹4,499 · ends 7 Oct, 4:07 pm');
    // The looping copy is hidden from assistive tech and the Tab order: one link per offer.
    expect(screen.getAllByRole('link')).toHaveLength(1);
    const copies = container.querySelectorAll('ul');
    expect(copies).toHaveLength(2);
    expect(copies[1]!.getAttribute('aria-hidden')).toBe('true');
    expect(copies[1]!.querySelector('a')!.getAttribute('tabindex')).toBe('-1');
    expect(
      screen.getAllByText(
        'No minimum order · selected categories · not on flash sale or bundle prices · till Mon, 4 Jan',
      ),
    ).toHaveLength(2);
    expect(screen.getAllByText('On orders of ₹15,000 or more · till Mon, 4 Jan')).toHaveLength(2);
    expect(screen.getAllByText('AUDIO10')).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-191: the moving ticker can be paused and started again (WCAG 2.2.2)', async () => {
    const { container } = await renderWithRouter(<OfferStripView offers={tiles} />);
    const pause = screen.getByRole('button', { name: 'Pause offers' });
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(pause);
    expect(pause.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[class*="animation-play-state:paused"]')).toBeTruthy();
    fireEvent.click(pause);
    expect(pause.getAttribute('aria-pressed')).toBe('false');
  });

  it('D-191: renders nothing when no offer is live', async () => {
    const { container } = await renderWithRouter(<OfferStripView offers={[]} />);
    expect(container.querySelector('section')).toBeNull();
  });
});
