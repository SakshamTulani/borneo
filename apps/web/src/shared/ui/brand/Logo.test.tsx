import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Logo } from './Logo';

describe('Logo', () => {
  it('is announced once as Borneo', async () => {
    const { container } = render(<Logo />);
    expect(screen.getAllByRole('img', { name: 'Borneo' })).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
  });
});
