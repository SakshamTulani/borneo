import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { OrderTimeline, type TimelineStep } from './OrderTimeline';

const steps: TimelineStep[] = [
  { label: 'Order placed', at: '6 Oct, 10:12 am', status: 'done' },
  { label: 'Shipped', at: '7 Oct, 6:40 pm', status: 'current' },
  { label: 'Delivered', status: 'upcoming' },
];

describe('OrderTimeline', () => {
  it('marks the current step', async () => {
    const { container } = render(<OrderTimeline steps={steps} />);
    const current = screen.getByText('Shipped').closest('li');
    expect(current?.getAttribute('aria-current')).toBe('step');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a cancelled outcome', async () => {
    const { container } = render(
      <OrderTimeline
        steps={steps.slice(0, 1)}
        outcome={{ kind: 'cancelled', label: 'Cancelled before dispatch', at: '6 Oct' }}
      />,
    );
    expect(screen.getByText('Cancelled before dispatch')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a return requested outcome', async () => {
    const { container } = render(
      <OrderTimeline
        steps={steps}
        outcome={{ kind: 'returnRequested', label: 'Replacement requested' }}
      />,
    );
    expect(screen.getByText('Replacement requested')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
