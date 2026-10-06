import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { RateLimiter, RateRule } from '../../plugins/rateLimit';
import {
  authResponseSchema,
  errorResponseSchema,
  noContent,
  passwordResetInputSchema,
  passwordResetRequestResponseSchema,
  passwordResetRequestSchema,
  sessionResponseSchema,
  signInInputSchema,
  signUpInputSchema,
} from './auth.schema';
import type { AuthService } from './auth.service';

const MINUTE = 60_000;

/** Auth rate limits (D-190). */
export const AUTH_RATE_RULES = {
  signIn: { max: 10, windowMs: 15 * MINUTE },
  signUp: { max: 10, windowMs: 60 * MINUTE },
  resetRequest: { max: 3, windowMs: 15 * MINUTE },
  reset: { max: 10, windowMs: 15 * MINUTE },
} satisfies Record<string, RateRule>;

const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  409: errorResponseSchema,
  429: errorResponseSchema,
};

const setCookies = (reply: FastifyReply, cookies: string[]) => {
  if (cookies.length > 0) void reply.header('set-cookie', cookies);
};

export function authRoutes(service: AuthService, limiter: RateLimiter): FastifyPluginAsync {
  return async (app) => {
    const r = app.withTypeProvider<ZodTypeProvider>();

    r.post(
      '/auth/sign-up',
      { schema: { body: signUpInputSchema, response: { 201: authResponseSchema, ...errors } } },
      async (request, reply) => {
        limiter.hit(`sign-up:${request.ip}`, AUTH_RATE_RULES.signUp);
        const { customer, cookies } = await service.signUp(request.body);
        setCookies(reply, cookies);
        return reply.status(201).send({ customer });
      },
    );

    r.post(
      '/auth/sign-in',
      { schema: { body: signInInputSchema, response: { 200: authResponseSchema, ...errors } } },
      async (request, reply) => {
        limiter.hit(`sign-in:${request.ip}:${request.body.email}`, AUTH_RATE_RULES.signIn);
        const { customer, cookies } = await service.signIn(request.body);
        setCookies(reply, cookies);
        return { customer };
      },
    );

    r.post(
      '/auth/sign-out',
      { schema: { response: { 204: noContent } } },
      async (request, reply) => {
        setCookies(reply, await service.signOut(request.headers.cookie));
        return reply.status(204).send(null);
      },
    );

    r.get(
      '/session',
      { schema: { response: { 200: sessionResponseSchema } } },
      async (request, reply) => {
        const current = await service.current(request.headers.cookie);
        // Personal: never cached by a shared cache.
        void reply.header('cache-control', 'private, no-store');
        if (!current) return { customer: null };
        setCookies(reply, current.cookies);
        return { customer: current.customer };
      },
    );

    r.post(
      '/auth/password-reset/request',
      {
        schema: {
          body: passwordResetRequestSchema,
          response: { 202: passwordResetRequestResponseSchema, ...errors },
        },
      },
      async (request, reply) => {
        limiter.hit(`reset-request:${request.body.email}`, AUTH_RATE_RULES.resetRequest);
        return reply.status(202).send(await service.requestPasswordReset(request.body.email));
      },
    );

    r.post(
      '/auth/password-reset',
      { schema: { body: passwordResetInputSchema, response: { 204: noContent, ...errors } } },
      async (request, reply) => {
        limiter.hit(`reset:${request.ip}:${request.body.email}`, AUTH_RATE_RULES.reset);
        await service.resetPassword(request.body);
        return reply.status(204).send(null);
      },
    );
  };
}
