import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { DesignSystemPage } from './DesignSystemPage';

describe('DesignSystemPage', () => {
  it('renders every section, labels demo data and has no axe violations', async () => {
    const { container } = render(<DesignSystemPage />);
    for (const name of ['Tokens', 'Base components', 'Commerce components']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
    }
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(10);
    expect(await axe(container)).toHaveNoViolations();
  }, 20_000);
});
