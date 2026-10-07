import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { policySummary } from '@borneo/shared';
import { renderWithRouter } from '@/test/router';
import { HelpPage } from './HelpPage';

describe('HelpPage', () => {
  it('D-224: answers come from the store rules; axe clean', async () => {
    const { container } = await renderWithRouter(<HelpPage />);
    expect(screen.getByText(policySummary('replacementOnly'))).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cancelling an order' })).toBeTruthy();
    expect(screen.getByText(/hold your items for 5 minutes/)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
