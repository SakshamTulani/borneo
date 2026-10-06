import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  cartAddResultSchema,
  cartEntrySchema,
  cartMergeRequestSchema,
  cartQuery,
  cartQuoteRequestSchema,
  cartViewSchema,
  couponBody,
  errorResponseSchema,
  lineParams,
  qtyBody,
  quoteResponse,
} from './cart.schema';
import type { CartService } from './cart.service';

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  422: errorResponseSchema,
};

/** Carts are personal and change with stock and offers: never cached. */
const noStore = (reply: FastifyReply) => void reply.header('cache-control', 'private, no-store');

export function cartRoutes(service: CartService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    // A browser cart (signed out, D-192): priced from the lines it sends; nothing is stored.
    r.post(
      '/cart/quote',
      { schema: { body: cartQuoteRequestSchema, response: { 200: quoteResponse, ...errors } } },
      async (request, reply) => {
        noStore(reply);
        return service.quote(request.body);
      },
    );

    r.get(
      '/me/cart',
      { schema: { querystring: cartQuery, response: { 200: cartViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.get(customerId, request.query.pincode);
      },
    );

    r.post(
      '/me/cart/lines',
      {
        schema: {
          querystring: cartQuery,
          body: cartEntrySchema,
          response: { 200: cartAddResultSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.add(customerId, request.body, request.query.pincode);
      },
    );

    r.patch(
      '/me/cart/lines/:key',
      {
        schema: {
          params: lineParams,
          querystring: cartQuery,
          body: qtyBody,
          response: { 200: cartViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.setQty(
          customerId,
          request.params.key,
          request.body.qty,
          request.query.pincode,
        );
      },
    );

    r.delete(
      '/me/cart/lines/:key',
      {
        schema: {
          params: lineParams,
          querystring: cartQuery,
          response: { 200: cartViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.remove(customerId, request.params.key, request.query.pincode);
      },
    );

    r.put(
      '/me/cart/coupon',
      {
        schema: {
          querystring: cartQuery,
          body: couponBody,
          response: { 200: cartViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.applyCoupon(customerId, request.body.code, request.query.pincode);
      },
    );

    r.delete(
      '/me/cart/coupon',
      { schema: { querystring: cartQuery, response: { 200: cartViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.removeCoupon(customerId, request.query.pincode);
      },
    );

    r.post(
      '/me/cart/merge',
      {
        schema: {
          querystring: cartQuery,
          body: cartMergeRequestSchema,
          response: { 200: cartViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.merge(customerId, request.body, request.query.pincode);
      },
    );
  };
}
