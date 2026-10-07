import { createFileRoute } from '@tanstack/react-router';
import { HelpPage } from '../features/help';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/help')({
  head: () =>
    pageHead({
      title: 'Help',
      description: 'Delivery, payment, cancelling and returns at Borneo.',
      path: '/help',
    }),
  component: HelpPage,
});
