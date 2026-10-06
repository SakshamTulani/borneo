import { createFileRoute } from '@tanstack/react-router';
import { CategoriesPage } from '../features/catalog';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/categories/')({
  head: () =>
    pageHead({
      title: 'All categories',
      description: 'Every Borneo category: phones, audio, wearables, accessories, TVs and more.',
      path: '/categories',
    }),
  component: CategoriesPage,
});
