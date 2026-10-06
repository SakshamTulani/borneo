import { createFileRoute, notFound } from '@tanstack/react-router';
import { ProductPage, productQuery } from '../features/product';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/products/$slug')({
  validateSearch: (raw: Record<string, unknown>): { variant?: string } =>
    typeof raw.variant === 'string' ? { variant: raw.variant } : {},
  loader: async ({ context: { queryClient }, params }) => {
    const product = await queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    return {
      name: product.name,
      description: product.explainer ?? `${product.name} from Borneo ${product.category.name}.`,
    };
  },
  // One canonical URL per product; the variant parameter is not part of it.
  head: ({ loaderData, params }) =>
    pageHead({
      title: loaderData?.name ?? 'Product',
      description: loaderData?.description,
      path: `/products/${params.slug}`,
      type: 'product',
    }),
  component: ProductRoute,
});

function ProductRoute() {
  const { slug } = Route.useParams();
  const { variant } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProductPage
      slug={slug}
      sku={variant}
      onSkuChange={(sku) =>
        void navigate({ search: { variant: sku }, replace: true, resetScroll: false })
      }
    />
  );
}
