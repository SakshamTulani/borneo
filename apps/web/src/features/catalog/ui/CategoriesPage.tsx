import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Container } from '@/shared/ui/layout/Container';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';
import { CategoryGrid } from './CategoryGrid';

/** Every category (mobile "Categories" tab). */
export function CategoriesPage() {
  const categories = useCategoriesQuery();
  return (
    <Container className="space-y-6 py-8">
      <h1 className="font-heading text-title tracking-tight">Categories</h1>
      {categories.isError ? (
        <ErrorState title="Couldn't load categories" onRetry={() => void categories.refetch()} />
      ) : (
        <CategoryGrid categories={categories.data ?? []} />
      )}
    </Container>
  );
}
