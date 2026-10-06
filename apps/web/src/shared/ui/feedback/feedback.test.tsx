import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DemoBox } from './DemoBox';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

describe('feedback', () => {
  it('EmptyState', async () => {
    const { container } = render(
      <EmptyState title="Your cart is empty" body="Add something you like." />,
    );
    expect(screen.getByText('Your cart is empty')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ErrorState announces and retries', async () => {
    const onRetry = vi.fn();
    const { container } = render(<ErrorState title="Couldn't load products" onRetry={onRetry} />);
    expect(screen.getByRole('alert').textContent).toContain("Couldn't load products");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('DemoBox labels demo content', async () => {
    const { container } = render(<DemoBox>Reset code 482913</DemoBox>);
    expect(screen.getByRole('note', { name: 'Demo mode: this would be emailed' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
