import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ApiStatusBadge } from './ApiStatusBadge';

describe('ApiStatusBadge', () => {
  it('shows API, database and demo state accessibly', async () => {
    const { container } = render(
      <ApiStatusBadge
        status={{ reachable: true, demoMode: true, databaseUp: true }}
        isError={false}
      />,
    );

    expect(screen.getByRole('status').textContent).toBe('API up · database up · demo mode');
    expect(await axe(container)).toHaveNoViolations();
  });
});
