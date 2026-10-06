import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { SpecTable } from './SpecTable';

describe('SpecTable', () => {
  it('groups rows and marks missing values', async () => {
    const { container } = render(
      <SpecTable
        groups={[
          {
            title: 'Battery',
            rows: [{ label: 'Capacity', value: '5000 mAh' }, { label: 'Wireless charging' }],
          },
        ]}
      />,
    );
    expect(screen.getByRole('table', { name: 'Battery' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Capacity' })).toBeTruthy();
    expect(screen.getByText('Not specified')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('empty', async () => {
    const { container } = render(<SpecTable groups={[]} />);
    expect(screen.getByText('Specifications coming soon')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
