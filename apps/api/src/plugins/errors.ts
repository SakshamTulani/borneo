import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import type { ErrorResponse } from '@borneo/shared';
import { AppError } from '../errors';

const codeFor: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
};

/** Renders every error as `{ error: { code, message, details? } }`. Never leaks 5xx internals. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError | AppError>((err, request, reply) => {
    let status: number;
    let body: ErrorResponse;
    if (err instanceof AppError) {
      status = err.statusCode;
      body = {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      };
    } else if (hasZodFastifySchemaValidationErrors(err)) {
      status = 400;
      body = {
        error: {
          code: 'VALIDATION',
          message: 'Request is invalid',
          details: err.validation.map((v) => ({ path: v.instancePath, message: v.message })),
        },
      };
    } else if (err.statusCode !== undefined && err.statusCode < 500) {
      status = err.statusCode;
      body = { error: { code: codeFor[status] ?? 'BAD_REQUEST', message: err.message } };
    } else {
      request.log.error(err);
      status = 500;
      body = { error: { code: 'INTERNAL', message: 'Something went wrong' } };
    }
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `No route for ${request.method} ${request.url}` },
    }),
  );
}
