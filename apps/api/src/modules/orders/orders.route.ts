import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireCustomerId, type SessionReader } from '../../session/index';
import {
  attemptParams,
  botTokenSchema,
  checkoutQuerySchema,
  checkoutViewSchema,
  errors,
  mockPaymentRequestSchema,
  orderListQuerySchema,
  orderPageSchema,
  orderParams,
  orderViewSchema,
  pdfResponse,
  placeHeaders,
  placeOrderRequestSchema,
} from './orders.schema';
import type { OrdersService } from './orders.service';

/** Orders and checkouts are personal and change by the second (holds, stock): never cached. */
const noStore = (reply: FastifyReply) => void reply.header('cache-control', 'private, no-store');

export function ordersRoutes(service: OrdersService, session: SessionReader): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.get(
      '/me/checkout',
      {
        schema: {
          querystring: checkoutQuerySchema,
          response: { 200: checkoutViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.checkout(customerId, request.query);
      },
    );

    r.post(
      '/me/orders',
      {
        schema: {
          headers: placeHeaders,
          body: placeOrderRequestSchema,
          response: { 200: orderViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.place(customerId, request.headers['idempotency-key'], request.body, {
          ip: request.ip,
          botToken: request.headers['x-bot-token'],
        });
      },
    );

    // Demo only (404 otherwise): the mock bot check's answer (D-232).
    r.post(
      '/me/bot-check',
      { schema: { response: { 200: botTokenSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.demoBotToken(customerId);
      },
    );

    r.get(
      '/me/orders',
      {
        schema: {
          querystring: orderListQuerySchema,
          response: { 200: orderPageSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.list(customerId, request.query);
      },
    );

    r.post(
      '/me/orders/:id/cancel',
      { schema: { params: orderParams, response: { 200: orderViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.cancel(customerId, request.params.id);
      },
    );

    // Demo only (404 otherwise): the demo courier's "Advance" (D-215).
    r.post(
      '/me/orders/:id/demo/advance',
      { schema: { params: orderParams, response: { 200: orderViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.demoAdvance(customerId, request.params.id);
      },
    );

    r.get(
      '/me/orders/:id',
      { schema: { params: orderParams, response: { 200: orderViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.get(customerId, request.params.id);
      },
    );

    r.post(
      '/me/orders/:id/payments',
      { schema: { params: orderParams, response: { 200: orderViewSchema, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.retryPayment(customerId, request.params.id);
      },
    );

    // Demo only (404 otherwise): the mock gateway page's buttons (D-213).
    r.post(
      '/me/orders/:id/payments/:attemptId/mock',
      {
        schema: {
          params: attemptParams,
          body: mockPaymentRequestSchema,
          response: { 200: orderViewSchema, ...errors },
        },
      },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        noStore(reply);
        return service.mockPay(
          customerId,
          request.params.id,
          request.params.attemptId,
          request.body,
        );
      },
    );

    r.get(
      '/me/orders/:id/invoice',
      { schema: { params: orderParams, response: { 200: pdfResponse, ...errors } } },
      async (request, reply) => {
        const customerId = await requireCustomerId(session, request);
        const { filename, pdf } = await service.invoicePdf(customerId, request.params.id);
        noStore(reply);
        return reply
          .type('application/pdf')
          .header('content-disposition', `attachment; filename="${filename}"`)
          .send(Buffer.from(pdf));
      },
    );
  };
}
