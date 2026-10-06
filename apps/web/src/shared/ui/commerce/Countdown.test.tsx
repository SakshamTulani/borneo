import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Countdown } from './Countdown';

const endsAt = '2026-12-31T18:29:59Z';
const end = Date.parse(endsAt);

describe('Countdown', () => {
  afterEach(() => vi.useRealTimers());

  it('upcoming', async () => {
    const { container } = render(
      <Countdown
        endsAt={endsAt}
        startsAt="2026-12-31T12:30:00Z"
        now={Date.parse('2026-12-31T10:00:00Z')}
      />,
    );
    expect(screen.getByRole('timer').textContent).toBe('Starts in 02:30:00');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('live', async () => {
    const { container } = render(<Countdown endsAt={endsAt} now={end - 2 * 3600_000} />);
    expect(screen.getByRole('timer').textContent).toBe('Ends in 02:00:00');
    expect(screen.getByText('Ends 31 Dec, 11:59 pm')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('urgent is announced once', async () => {
    const { container } = render(<Countdown endsAt={endsAt} now={end - 45_000} />);
    expect(screen.getByText('Less than a minute left')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ended', async () => {
    const { container } = render(<Countdown endsAt={endsAt} now={end + 1} />);
    expect(screen.getByRole('timer').textContent).toBe('Ended 31 Dec, 11:59 pm');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ticks down against the real deadline and never resets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(end - 3_000);
    render(<Countdown endsAt={endsAt} />);
    expect(screen.getByRole('timer').textContent).toBe('Ends in 00:00:03');
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole('timer').textContent).toBe('Ends in 00:00:01');
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('timer').textContent).toBe('Ended 31 Dec, 11:59 pm');
  });
});
