import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useProductQuery } from '../hooks/useProductQuery';
import { selectedVariant } from '../mappers/variantSelection';
import { ProductView } from './ProductView';

type Props = {
  slug: string;
  /** Selected variant from the URL (`?variant=SKU`), so a choice can be shared. */
  sku: string | undefined;
  onSkuChange: (sku: string) => void;
};

export function ProductPage({ slug, sku, onSkuChange }: Props) {
  const query = useProductQuery(slug);
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load this product"
        onRetry={() => void query.refetch()}
        className="my-8"
      />
    );
  }
  if (!query.data) {
    return query.isPending ? null : <EmptyState title="Product not found" className="my-8" />;
  }
  return (
    <ProductView
      product={query.data}
      variant={selectedVariant(query.data, sku)}
      onVariantChange={onSkuChange}
    />
  );
}
