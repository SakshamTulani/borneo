import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Rating } from './Rating';

describe('Rating', () => {
  it('shows score and verified count', async () => {
    const { container } = render(<Rating value={4.3} count={128} />);
    expect(screen.getByRole('img', { name: 'Rated 4.3 out of 5' })).toBeTruthy();
    expect(screen.getByText('128 verified reviews')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('never fakes a score with zero reviews', async () => {
    const { container } = render(<Rating value={5} count={0} />);
    expect(screen.getByText('No reviews yet')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
