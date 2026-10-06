import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useCategoriesQuery } from '../hooks/useCategoriesQuery';
import { CategoryGrid } from './CategoryGrid';

/** Every category (mobile "Categories" tab). */
export function CategoriesPage() {
  const categories = useCategoriesQuery();
  return (
    <div className="space-y-4 py-6">
      <h1 className="font-heading text-3xl font-bold">Categories</h1>
      {categories.isError ? (
        <ErrorState title="Couldn't load categories" onRetry={() => void categories.refetch()} />
      ) : (
        <CategoryGrid categories={categories.data ?? []} />
      )}
    </div>
  );
}
