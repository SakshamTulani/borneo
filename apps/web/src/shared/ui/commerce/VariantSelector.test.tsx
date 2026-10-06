import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { VariantSelector } from './VariantSelector';

const options = [
  { value: '128', label: '128 GB', available: true },
  { value: '256', label: '256 GB', available: true },
  { value: '512', label: '512 GB', available: false },
];

describe('VariantSelector', () => {
  it('shows selection, disables unavailable options and reports changes', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <VariantSelector
        legend="Storage"
        options={options}
        value="128"
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: /Storage/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '128 GB' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '512 GB, out of stock' })).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('radio', { name: '256 GB' }));
    expect(onValueChange).toHaveBeenCalledWith('256');
    expect(await axe(container)).toHaveNoViolations();
  });
});
