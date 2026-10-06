import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DeliveryChecker, type DeliveryState } from './DeliveryChecker';

const renderWith = (state: DeliveryState, onCheck = vi.fn()) =>
  render(
    <DeliveryChecker pincode="560001" onPincodeChange={() => {}} onCheck={onCheck} state={state} />,
  );

describe('DeliveryChecker', () => {
  it('submits a check', () => {
    const onCheck = vi.fn();
    renderWith({ status: 'idle' }, onCheck);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCheck).toHaveBeenCalledOnce();
  });

  it.each<[string, DeliveryState, string]>([
    [
      'deliverable with COD',
      {
        status: 'deliverable',
        from: '2026-10-09T06:00:00Z',
        to: '2026-10-11T06:00:00Z',
        cod: true,
      },
      'Estimated delivery Fri, 9 – Sun, 11 Oct',
    ],
    [
      'deliverable without COD',
      {
        status: 'deliverable',
        from: '2026-10-09T06:00:00Z',
        to: '2026-10-11T06:00:00Z',
        cod: false,
      },
      'Cash on delivery not available here',
    ],
    ['not deliverable', { status: 'notDeliverable' }, 'Not deliverable to 560001 yet'],
    ['out of stock here', { status: 'outOfStockHere' }, 'Out of stock for 560001'],
  ])('%s', async (_name, state, text) => {
    const { container } = renderWith(state);
    expect(screen.getByText(text)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-186: says why COD is off when the reason is known', () => {
    renderWith({
      status: 'deliverable',
      from: '2026-10-28T06:00:00Z',
      to: '2026-11-05T06:00:00Z',
      cod: false,
      codNote: 'Pre-orders are paid online; no cash on delivery',
    });
    expect(screen.getByText('Pre-orders are paid online; no cash on delivery')).toBeTruthy();
  });

  it('shows the place and a failed check', async () => {
    const { container } = render(
      <DeliveryChecker
        pincode="560001"
        onPincodeChange={() => {}}
        onCheck={() => {}}
        state={{ status: 'error' }}
        place="Bengaluru, Karnataka"
      />,
    );
    expect(screen.getByText('Bengaluru, Karnataka')).toBeTruthy();
    expect(screen.getByText('Couldn’t check delivery. Try again.')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-52: offers a map only when asked, as a plain button', () => {
    const onChooseOnMap = vi.fn();
    const { rerender } = renderWith({ status: 'idle' });
    expect(screen.queryByRole('button', { name: 'Choose on map' })).toBeNull();
    rerender(
      <DeliveryChecker
        pincode=""
        onPincodeChange={() => {}}
        onCheck={() => {}}
        state={{ status: 'idle' }}
        onChooseOnMap={onChooseOnMap}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose on map' }));
    expect(onChooseOnMap).toHaveBeenCalledOnce();
  });

  it('checking state shows a busy button', async () => {
    const { container } = renderWith({ status: 'checking' });
    expect(screen.getByRole('button', { name: 'Check' }).getAttribute('aria-busy')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('invalid pincode is tied to the field', async () => {
    const { container } = renderWith({ status: 'invalid', message: 'Enter a 6-digit pincode' });
    const input = screen.getByLabelText('Delivery pincode');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Enter a 6-digit pincode',
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
