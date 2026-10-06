import { createFileRoute } from '@tanstack/react-router';
import { DesignSystemPage } from '../features/design-system';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/design-system')({
  head: () => pageHead({ title: 'Design system', noindex: true }),
  component: DesignSystemPage,
});
