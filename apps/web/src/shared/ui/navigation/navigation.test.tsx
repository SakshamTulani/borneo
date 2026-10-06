import { screen } from '@testing-library/react';
import { Link } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderWithRouter } from '@/test/router';
import { AppShell } from '../AppShell';
import { BottomNav } from './BottomNav';
import { Breadcrumbs } from './Breadcrumbs';

describe('navigation', () => {
  it('D-160: bottom nav marks the current page', async () => {
    const { container } = await renderWithRouter(<BottomNav />, { path: '/categories' });
    expect(screen.getByRole('link', { name: 'Categories' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('breadcrumbs mark the current page', async () => {
    const { container } = await renderWithRouter(
      <Breadcrumbs
        items={[
          { key: 'home', node: <Link to="/">Home</Link> },
          { key: 'here', node: 'Audio' },
        ]}
      />,
    );
    expect(screen.getByText('Audio').getAttribute('aria-current')).toBe('page');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('app shell has a skip link to main content', async () => {
    const { container } = await renderWithRouter(
      <AppShell nav={<nav aria-label="Categories" />}>
        <h1>Page</h1>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe(
      '#main',
    );
    expect(screen.getByRole('main').id).toBe('main');
    expect(await axe(container)).toHaveNoViolations();
  });
});
