---
name: new-api-module
description: Scaffold a Fastify module in apps/api (route, service, repository, schema, index) and register it in app.ts. Use when adding an endpoint or a backend capability.
---

# New API module

Rules: [backend-architecture](../../../docs/agents/backend-architecture.md) · [api-design](../../../docs/agents/api-design.md) · [ADR-0003](../../../docs/adr/0003-adapters-for-external-services.md) · [ADR-0005](../../../docs/adr/0005-customer-scoping-single-tenant.md)

Copy the shape of `apps/api/src/modules/health` (reference module).

1. `<m>.schema.ts`: Zod request/response; reuse contracts from `@borneo/shared`.
2. `<m>.repository.ts`: Drizzle only. Customer data ⇒ every export takes `customerId: CustomerId` first.
3. `<m>.service.ts`: `create<M>Service(deps)`; calls shared rules, repositories, adapters. No session, no HTTP.
4. `<m>.route.ts`: schemas, auth guard, `requireCustomerId(request)` from `src/session`, calls service.
5. `index.ts`: export the route plugin and service factory. Wire in `src/main.ts` + `src/app.ts`.
6. Needs tables? Run `/db-migration` first.
7. Tests: `/write-tests` (service with fakes, route via `app.inject`, repository on Postgres, `<m>.cross-customer.test.ts` if customer-scoped).
8. `pnpm check`.
