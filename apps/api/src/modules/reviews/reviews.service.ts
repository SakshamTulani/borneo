import {
  reviewerName,
  reviewPrompts,
  type CustomerId,
  type MyReviews,
  type ProductImage,
  type ReviewInput,
} from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { DeliveredLineRow } from '../orders/index';

export type ReviewsDeps = {
  now: () => number;
  listDelivered: (customerId: CustomerId) => Promise<DeliveredLineRow[]>;
  listMine: (customerId: CustomerId) => Promise<
    {
      review: {
        id: string;
        productId: string;
        rating: number;
        title: string | null;
        body: string | null;
        authorName: string;
        createdAt: Date;
      };
      productName: string;
      slug: string;
    }[]
  >;
  findLine: (
    customerId: CustomerId,
    orderItemId: string,
  ) => Promise<{ productId: string; status: string; customerName: string } | undefined>;
  insert: (
    customerId: CustomerId,
    values: {
      productId: string;
      orderItemId: string;
      rating: number;
      authorName: string;
      title: string | null;
      body: string | null;
      now: Date;
    },
  ) => Promise<string | null>;
  loadImages: (productIds: string[]) => Promise<Map<string, ProductImage[]>>;
};

/** Review prompts and verified reviews written in the account (D-150, D-151, D-221). */
export function createReviewsService(deps: ReviewsDeps) {
  async function mine(customerId: CustomerId): Promise<MyReviews> {
    const [delivered, written] = await Promise.all([
      deps.listDelivered(customerId),
      deps.listMine(customerId),
    ]);
    const prompts = reviewPrompts(
      delivered.map((l) => ({ ...l, deliveredAt: l.deliveredAt!.getTime() })),
      new Set(written.map((w) => w.review.productId)),
    );
    const images = await deps.loadImages(prompts.map((p) => p.productId));
    return {
      prompts: prompts.map((p) => ({
        orderItemId: p.orderItemId,
        productId: p.productId,
        productName: p.productName,
        slug: p.slug,
        image: images.get(p.productId)?.[0] ?? null,
        deliveredAt: p.deliveredAt,
      })),
      reviews: written.map((w) => ({
        id: w.review.id,
        productName: w.productName,
        slug: w.slug,
        rating: w.review.rating,
        title: w.review.title,
        body: w.review.body,
        authorName: w.review.authorName,
        createdAt: w.review.createdAt.getTime(),
      })),
    };
  }

  return {
    mine,

    /** Only for a delivered line of the customer's own (verified purchase, D-150). */
    async write(customerId: CustomerId, input: ReviewInput): Promise<MyReviews> {
      const line = await deps.findLine(customerId, input.orderItemId);
      if (!line) throw notFound('ORDER_ITEM_NOT_FOUND', "We couldn't find that item.");
      if (line.status !== 'delivered')
        throw new AppError(422, 'NOT_DELIVERED', 'You can review a product once it is delivered.');
      const id = await deps.insert(customerId, {
        productId: line.productId,
        orderItemId: input.orderItemId,
        rating: input.rating,
        authorName: reviewerName(line.customerName),
        title: input.title?.trim() || null,
        body: input.body?.trim() || null,
        now: new Date(deps.now()),
      });
      if (!id)
        throw new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this product.');
      return mine(customerId);
    },
  };
}

export type ReviewsService = ReturnType<typeof createReviewsService>;
