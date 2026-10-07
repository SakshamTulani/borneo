import { z } from 'zod';
import {
  checkoutQuerySchema,
  checkoutViewSchema,
  errorResponseSchema,
  idempotencyKeySchema,
  mockPaymentRequestSchema,
  orderListQuerySchema,
  orderPageSchema,
  orderViewSchema,
  placeOrderRequestSchema,
} from '@borneo/shared';

export const orderParams = z.object({ id: z.uuid() });
export const attemptParams = z.object({ id: z.uuid(), attemptId: z.uuid() });
/** Order placement is idempotent per customer (api-design.md). */
export const placeHeaders = z.object({
  'idempotency-key': idempotencyKeySchema,
  /** Flash checkout's bot-check token (D-232). */
  'x-bot-token': z.string().max(200).optional(),
});
export const botTokenSchema = z.object({ token: z.string(), expiresAt: z.number().int() });

/** Fastify sends a Buffer as is, without the serializer. */
export const pdfResponse = z.instanceof(Buffer);

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  422: errorResponseSchema,
  503: errorResponseSchema,
};

export {
  checkoutQuerySchema,
  checkoutViewSchema,
  mockPaymentRequestSchema,
  orderViewSchema,
  placeOrderRequestSchema,
};

export { orderListQuerySchema, orderPageSchema };

/** Keyset cursor for the order list: placed time and id, opaque to the client. */
export function orderCursor(placedAt: Date, id: string): string {
  return Buffer.from(`${placedAt.toISOString()}|${id}`).toString('base64url');
}

export function readOrderCursor(cursor: string): { placedAt: Date; id: string } | undefined {
  const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const placedAt = new Date(at ?? '');
  if (!id || Number.isNaN(placedAt.getTime()) || !z.uuid().safeParse(id).success) return undefined;
  return { placedAt, id };
}
