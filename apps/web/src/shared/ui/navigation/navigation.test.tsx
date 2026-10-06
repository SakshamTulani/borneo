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

  it('D-160: the bottom nav and header carry the cart with its count', async () => {
    const { container } = await renderWithRouter(
      <AppShell cartCount={3}>
        <h1>Page</h1>
      </AppShell>,
    );
    const links = screen.getAllByRole('link', { name: 'Cart, 3 items' });
    expect(links).toHaveLength(2);
    for (const l of links) expect(l.getAttribute('href')).toBe('/cart');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-214: every page opens with the shipping line above the header', async () => {
    const { container } = await renderWithRouter(
      <AppShell>
        <h1>Page</h1>
      </AppShell>,
    );
    const line = screen.getByText(/Free delivery on every order/);
    expect(line.textContent).toBe(
      'Free delivery on every order·Cash on delivery where available·7-day returns or replacement',
    );
    expect(line.compareDocumentPosition(container.querySelector('header')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
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
