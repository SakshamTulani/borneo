import { useEffect } from 'react';
import { track } from '@/features/analytics';
import { useDefaultPincodeQuery } from '@/features/addresses';
import { BundleOffers, ProductPurchase } from '@/features/cart';
import { UpgradePanel } from '@/features/upgrade';
import { WatchButton } from '@/features/watch';
import { WishlistButton } from '@/features/wishlist';
import { ProductDelivery } from '@/features/delivery';
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
  useEffect(() => track('product_view', { slug }), [slug]);
  // Signed in with a default address: delivery starts from its pincode (D-185).
  const defaultPincode = useDefaultPincodeQuery().data ?? null;
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load this product"
        onRetry={() => void query.refetch()}
        className="mx-4 my-10 sm:mx-6"
      />
    );
  }
  if (!query.data) {
    return query.isPending ? null : (
      <EmptyState title="Product not found" className="mx-4 my-10 sm:mx-6" />
    );
  }
  const variant = selectedVariant(query.data, sku);
  return (
    <ProductView
      product={query.data}
      variant={variant}
      onVariantChange={onSkuChange}
      delivery={<ProductDelivery sku={variant.sku} defaultPincode={defaultPincode} />}
      purchase={
        <div className="space-y-3">
          <ProductPurchase
            productName={query.data.name}
            sku={variant.sku}
            availability={variant.availability}
            sellingPaise={variant.price.sellingPaise}
          />
          <WatchButton sku={variant.sku} availability={variant.availability} />
          <WishlistButton slug={query.data.slug} name={query.data.name} />
        </div>
      }
      bundles={<BundleOffers bundles={query.data.bundles} />}
      upgrade={<UpgradePanel slug={query.data.slug} />}
    />
  );
}
