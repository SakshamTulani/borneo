import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders every kind with a text label', async () => {
    const { container } = render(
      <>
        <StatusBadge kind="inStock" />
        <StatusBadge kind="lowStock" count={3} />
        <StatusBadge kind="outOfStock" />
        <StatusBadge kind="preorder" />
        <StatusBadge kind="flashSale" />
        <StatusBadge kind="newLaunch" />
        <StatusBadge kind="upgradeAvailable" />
        <StatusBadge kind="bundle" />
        <StatusBadge kind="worksWith" ecosystem="Alexa" />
      </>,
    );
    for (const text of [
      'In stock',
      'Only 3 left',
      'Out of stock',
      'Pre-order',
      'Flash sale',
      'New',
      'Upgrade available',
      'Bundle',
      'Works with Alexa',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(await axe(container)).toHaveNoViolations();
  });
});
