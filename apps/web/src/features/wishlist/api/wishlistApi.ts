import { wishlistPageSchema, wishlistSlugsSchema, type WishlistPage } from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

const slug = encodeURIComponent;

export const getWishlist = (cursor?: string): Promise<WishlistPage> =>
  getJson(`/me/wishlist?limit=24${cursor ? `&cursor=${slug(cursor)}` : ''}`, wishlistPageSchema);

export const getWishlistSlugs = (): Promise<{ slugs: string[] }> =>
  getJson('/me/wishlist/slugs', wishlistSlugsSchema);

export const putWishlist = (s: string) =>
  sendJson('PUT', `/me/wishlist/${slug(s)}`, undefined, wishlistSlugsSchema);

export const deleteWishlist = (s: string) =>
  sendJson('DELETE', `/me/wishlist/${slug(s)}`, undefined, wishlistSlugsSchema);
