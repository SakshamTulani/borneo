import { createFileRoute } from '@tanstack/react-router';
import { CartPage } from '../features/cart';
import { pageHead } from '../shared/lib/seo';

// Personal and changing: rendered for the shopper, never indexed. The browser cart (signed out)
// lives in localStorage, so it loads after hydration (D-192).
export const Route = createFileRoute('/cart')({
  head: () => pageHead({ title: 'Your cart', noindex: true }),
  component: CartPage,
});
