import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { OfferCard } from './OfferCard';

const base = {
  kind: 'coupon' as const,
  title: 'Demo ₹500 off',
  description: 'On orders above ₹4,999.',
  code: 'DEMO500',
};

describe('OfferCard', () => {
  it('available: can be applied', async () => {
    const onApply = vi.fn();
    const { container } = render(<OfferCard {...base} status="available" onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Demo ₹500 off' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('applied', async () => {
    const { container } = render(<OfferCard {...base} status="applied" />);
    expect(screen.getByText('Applied')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('not applicable explains why', async () => {
    const { container } = render(
      <OfferCard
        kind="bank"
        title="Demo Bank 10% off"
        description="Credit cards only."
        status="notApplicable"
        reason="a coupon is already applied"
      />,
    );
    expect(screen.getByText('Not applicable: a coupon is already applied')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
