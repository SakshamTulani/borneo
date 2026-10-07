import { createFileRoute } from '@tanstack/react-router';
import { wishlistQuery, WishlistPage } from '../features/wishlist';
import { pageHead } from '../shared/lib/seo';

export const Route = createFileRoute('/account/wishlist')({
  loader: ({ context: { queryClient } }) => queryClient.prefetchInfiniteQuery(wishlistQuery),
  head: () => pageHead({ title: 'Wishlist', noindex: true }),
  component: () => (
    <section aria-labelledby="wishlist-heading" className="space-y-5">
      <h2 id="wishlist-heading" className="font-heading text-tagline font-semibold">
        Wishlist
      </h2>
      <WishlistPage />
    </section>
  ),
});
