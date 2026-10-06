import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { QuantityStepper } from './QuantityStepper';
import { StickyPurchaseBar } from './StickyPurchaseBar';

describe('QuantityStepper', () => {
  it('steps within its limits and names what it counts; axe clean', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <QuantityStepper value={2} max={3} label="Echo Buds 2" onChange={onChange} />,
    );
    expect(screen.getByRole('group', { name: 'Quantity of Echo Buds 2' }).textContent).toContain(
      '2',
    );
    fireEvent.click(screen.getByRole('button', { name: 'One more Echo Buds 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'One fewer Echo Buds 2' }));
    expect(onChange.mock.calls).toEqual([[3], [1]]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-193: stops at the maximum and at 1; disabled while updating', () => {
    const { rerender } = render(
      <QuantityStepper value={3} max={3} label="TV" onChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'One more TV' }).hasAttribute('disabled')).toBe(true);
    rerender(<QuantityStepper value={1} max={3} label="TV" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'One fewer TV' }).hasAttribute('disabled')).toBe(
      true,
    );
    rerender(<QuantityStepper value={2} max={3} label="TV" onChange={() => {}} disabled />);
    expect(screen.getByRole('button', { name: 'One more TV' }).hasAttribute('disabled')).toBe(true);
  });
});

describe('StickyPurchaseBar', () => {
  it('D-160: shows the name, the selling price and the action; axe clean', async () => {
    const { container } = render(
      <StickyPurchaseBar
        name="Borneo Pulse 4"
        sellingPaise={1_499_900}
        action={<button>Add to cart</button>}
      />,
    );
    expect(screen.getByText('Borneo Pulse 4')).toBeTruthy();
    expect(screen.getByText('₹14,999')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
