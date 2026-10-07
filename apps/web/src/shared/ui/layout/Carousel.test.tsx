import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Carousel } from './Carousel';

const slides = ['A', 'B', 'C'].map((n) => ({ key: n, label: `Slide ${n}`, node: <p>{n}</p> }));
const current = () =>
  screen
    .getAllByRole('button', { name: /^Show slide/ })
    .findIndex((b) => b.getAttribute('aria-current'));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Carousel', () => {
  it('labels slides "n of total" and moves with its controls; axe clean', async () => {
    const { container } = render(<Carousel label="Featured" slides={slides} />);
    expect(
      screen.getByRole('region', { name: 'Featured' }).getAttribute('aria-roledescription'),
    ).toBe('carousel');
    expect(screen.getByRole('group', { name: '2 of 3: Slide B' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Show slide 3: Slide C' }));
    expect(current()).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(current()).toBe(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('advances by itself, stops when paused (WCAG 2.2.2)', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    render(<Carousel label="Featured" slides={slides} intervalMs={1000} />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(current()).toBe(1);
    act(() => screen.getByRole('button', { name: 'Pause slides' }).click());
    act(() => void vi.advanceTimersByTime(3000));
    expect(current()).toBe(1);
    expect(screen.getByRole('button', { name: 'Play slides' })).toBeTruthy();
  });

  it('never moves by itself under reduced motion, and has no pause button then', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<Carousel label="Featured" slides={slides} intervalMs={1000} />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(current()).toBe(0);
    expect(screen.queryByRole('button', { name: 'Pause slides' })).toBeNull();
  });
});
