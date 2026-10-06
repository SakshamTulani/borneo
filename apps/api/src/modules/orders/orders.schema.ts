import { z } from 'zod';
import {
  checkoutQuerySchema,
  checkoutViewSchema,
  errorResponseSchema,
  idempotencyKeySchema,
  mockPaymentRequestSchema,
  orderViewSchema,
  placeOrderRequestSchema,
} from '@borneo/shared';

export const orderParams = z.object({ id: z.uuid() });
export const attemptParams = z.object({ id: z.uuid(), attemptId: z.uuid() });
/** Order placement is idempotent per customer (api-design.md). */
export const placeHeaders = z.object({ 'idempotency-key': idempotencyKeySchema });

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
