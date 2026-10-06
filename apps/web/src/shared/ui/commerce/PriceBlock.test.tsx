import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { PriceBlock } from './PriceBlock';

describe('PriceBlock', () => {
  it('headline is the selling price, with MRP, savings, effective price and EMI below', async () => {
    const { container } = render(
      <PriceBlock
        sellingPaise={2_499_900}
        mrpPaise={2_999_900}
        savings={{ paise: 500_000, percent: 17 }}
        effective={{ paise: 2_349_900, offerName: 'Demo Bank card offer' }}
        emiFromPaise={208_325}
        size="lg"
      />,
    );
    expect(container.querySelector('p > span')?.textContent).toBe('Price ₹24,999');
    expect(screen.getByText('₹29,999').tagName).toBe('DEL');
    expect(screen.getByText('Save ₹5,000 (17%)')).toBeTruthy();
    expect(screen.getByText(/effective with Demo Bank card offer/)).toBeTruthy();
    expect(screen.getByText('₹2,083.25')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('plain price has no MRP or savings', async () => {
    const { container } = render(<PriceBlock sellingPaise={99_900} />);
    expect(screen.queryByText(/MRP/)).toBeNull();
    expect(screen.queryByText(/Save/)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-33: compact card form keeps price, genuine MRP, savings and EMI from', async () => {
    const { container } = render(
      <PriceBlock
        sellingPaise={2_499_900}
        mrpPaise={2_999_900}
        savings={{ paise: 500_000, percent: 17 }}
        emiFromPaise={208_325}
        size="sm"
      />,
    );
    expect(container.querySelector('p > span')?.textContent).toBe('Price ₹24,999');
    expect(screen.getByText('₹29,999').tagName).toBe('DEL');
    expect(screen.getByText('17% off')).toBeTruthy();
    expect(screen.getByText('₹2,083.25')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('unavailable', async () => {
    const { container } = render(<PriceBlock sellingPaise={99_900} unavailable />);
    expect(screen.getByText('Currently unavailable')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
