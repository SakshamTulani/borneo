import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { productFixture, variantFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { ProductView } from './ProductView';

const product = productFixture();

describe('ProductView', () => {
  it('shows price, policy, specs, FAQs and reasoned suggestions; axe clean', async () => {
    const { container } = await renderWithRouter(
      <ProductView product={product} variant={product.variants[0]!} onVariantChange={() => {}} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Borneo Pulse 4' })).toBeTruthy();
    expect(screen.getByText('₹14,999')).toBeTruthy();
    expect(screen.getByText(/^Replacement within 7 days/)).toBeTruthy();
    expect(screen.getByText('Connector: USB-C')).toBeTruthy();
    expect(screen.getByText('Not specified')).toBeTruthy();
    expect(screen.getByText('Is there a charger in the box?')).toBeTruthy();
    expect(screen.getByText(/^No reviews yet\. Only customers who bought/)).toBeTruthy();
    const suggestions = screen.getByRole('region', { name: 'Goes well with' });
    expect(within(suggestions).getByText('Fits your Borneo Pulse 4')).toBeTruthy();
    expect(
      within(suggestions)
        .getByRole('link', { name: 'Shield case for Pulse 4' })
        .getAttribute('href'),
    ).toBe('/products/shield-pulse-4');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches variant through the selector, keeping other choices', async () => {
    const onVariantChange = vi.fn();
    await renderWithRouter(
      <ProductView
        product={product}
        variant={product.variants[0]!}
        onVariantChange={onVariantChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '8 GB + 256 GB' }));
    expect(onVariantChange).toHaveBeenCalledWith('BP4-8-256-FOR');
    expect(
      (screen.getByRole('radio', { name: 'Graphite, out of stock' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('D-140: a live flash sale shows its badge, real count and countdown; coupons not applicable', async () => {
    const flash = variantFixture({
      price: { sellingPaise: 1_299_900, priceSource: 'flash', mrpPaise: 1_699_900 },
      flash: { endsAt: Date.UTC(2026, 9, 7), lowStockCount: 2 },
      offers: [
        {
          id: 'o2',
          kind: 'coupon',
          name: '₹500 off',
          validTo: Date.UTC(2026, 9, 31),
          status: 'notApplicable',
          reason: "Coupons don't apply to flash sale prices",
        },
      ],
    });
    const { container } = await renderWithRouter(
      <ProductView
        product={productFixture({ variants: [flash] })}
        variant={flash}
        onVariantChange={() => {}}
      />,
    );
    expect(screen.getByText('Flash sale', { selector: '[data-slot=badge]' })).toBeTruthy();
    expect(screen.getByText('Only 2 left')).toBeTruthy();
    expect(screen.getByText(/Not applicable: Coupons don't apply/)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-64: a pre-order shows its dispatch range', async () => {
    const pre = variantFixture({ availability: 'preorder' });
    await renderWithRouter(
      <ProductView
        product={productFixture({
          status: 'preorder',
          dispatch: { from: '2026-10-20', to: '2026-10-24' },
          variants: [pre],
        })}
        variant={pre}
        onVariantChange={() => {}}
      />,
    );
    expect(screen.getByText('Pre-order', { selector: '[data-slot=badge]' })).toBeTruthy();
    expect(screen.getByText('Tue, 20 – Sat, 24 Oct')).toBeTruthy();
  });

  it('D-17: a discontinued product points to its successor and shows no price or offers', async () => {
    const old = variantFixture({ availability: 'outOfStock' });
    const { container } = await renderWithRouter(
      <ProductView
        product={productFixture({
          status: 'discontinued',
          variants: [old],
          successor: { slug: 'pulse-5', name: 'Borneo Pulse 5' },
        })}
        variant={old}
        onVariantChange={() => {}}
      />,
    );
    expect(screen.getByRole('link', { name: 'Borneo Pulse 5' }).getAttribute('href')).toBe(
      '/products/pulse-5',
    );
    expect(screen.queryByText('₹14,999')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Offers' })).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
