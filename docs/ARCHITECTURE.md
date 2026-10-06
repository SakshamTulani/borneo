# Architecture

Status: proposed. Choices marked *(ADR-NNNN)* wait for acceptance before code depends on them.

## Stack (and why)

| Area | Choice | Why |
|---|---|---|
| Web | React + TypeScript + Vite SPA | Fast dev loop, simplest deploy; SEO deferred *(ADR-0001)* |
| Routing / data | TanStack Router + Query | Type-safe routes and search params (filters live in URL); cache + invalidation without global store |
| UI | Tailwind + shadcn/ui | Tokens in one place; owned, accessible primitives (Radix) we can restyle to our identity |
| Forms | React Hook Form + Zod | Same Zod schemas as the API; one validation source |
| Maps | Leaflet + OpenStreetMap | Map pin per address without paid API keys |
| API | Node + Fastify + fastify-type-provider-zod | Fast, plugin-based; Zod schemas type routes end to end |
| DB | PostgreSQL + Drizzle + drizzle-kit | Relational data (orders, stock, offers) with SQL-first, typed queries and migrations |
| Search | Postgres pg_trgm + synonyms table | Typo tolerance without another service *(ADR-0002)* |
| Auth | Better Auth (email + password) | Self-hosted, Drizzle adapter; verification switchable on for production |
| Jobs | pg-boss | Hold expiry, late payments, timers on the DB we already run *(ADR-0004)* |
| Files | MinIO (S3 API) | Product media, return photos, invoices; swap to any S3 later |
| Shared | `packages/shared` | Zod schemas, money (paise), pure business rules *(ADR-0006)* |
| Tooling | pnpm workspaces, Vitest, RTL, vitest-axe, ESLint, Prettier, dependency-cruiser, lefthook, Docker Compose | One repo, one gate: `pnpm check` (lint, typecheck, tests, boundaries) |

## Repo layout

```
apps/web        React SPA
apps/api        Fastify API
packages/shared Zod schemas, money, rules (no I/O, no framework)
docs/           PRD, DECISIONS, ADRs, ...
```

`shared` imports nothing from apps. Apps import `shared`. Apps never import each other.

## Principles

- **Rules are pure.** Pricing, offer stacking, 5-min hold, serviceability, COD, returns, upgrade badge, compatibility live in `packages/shared/rules` as pure functions with unit tests. UI and API only call them. Why: one source of truth, testable, same result on both sides.
- **Money is integer paise** *(ADR-0006)*. Why: no float rounding; GST-inclusive INR.
- **Adapters for the outside world** *(ADR-0003)*: `NotificationAdapter`, `PaymentGateway`, `Analytics`, plus `CourierTracking`, `BotProtection`. Demo implementations: on-screen box + log + inbox, mock gateway (success / fail / late success), console + log. Why: swap for real providers without touching pages.
- **Single brand, no tenancy** *(ADR-0005)*. Every customer-owned row has `customerId`; repositories require it. Why: simple, and still prevents cross-customer leaks.
- **Demo mode**: one `DEMO_MODE` flag picks demo adapters and relaxes verification. API refuses to start with `DEMO_MODE=true` when `NODE_ENV=production`.
- **Layered slices with enforced boundaries** *(ADR-0007)*, checked by dependency-cruiser in `pnpm check`.

## Frontend structure

```
apps/web/src/
  routes/                      thin: parse params, compose feature UI
  features/<feature>/
    api/          raw HTTP only (fetch + Zod parse)
    mappers/      DTO -> model
    repository/   combines api + mappers; the only data entry for hooks
    model.ts      feature types
    hooks/        one hook per file: use<Name>Query, use<Feature>Result, use<Feature>Form
    ui/           components
    index.ts      public exports only
  shared/ui/      design-system components (shadcn-based)
  shared/lib/     generic helpers
```

Import direction (downward only): `routes → ui → hooks → repository → mappers/api → model`. `@borneo/shared` usable from any layer.
- Cross-feature imports only via `features/<x>/index.ts`.
- No feature imports `routes`.
- Business rules never re-implemented in UI; call `@borneo/shared/rules`.

Planned features: `catalog`, `search`, `product`, `compare`, `finder`, `relationships`, `serviceability`, `cart`, `pricing`, `checkout`, `payment`, `auth`, `account`, `orders`, `returns`, `reviews`, `watch`, `flash-sale`, `upgrade`, `notifications`.

## API structure

```
apps/api/src/
  modules/<module>/
    <module>.route.ts       HTTP: schema binding, auth guard, calls service
    <module>.service.ts     orchestration; calls shared rules + repositories + adapters
    <module>.repository.ts  Drizzle queries only; customer-scoped methods take customerId
    <module>.schema.ts      Zod request/response (re-exports from shared where possible)
    index.ts                public exports (plugin + service interface)
  adapters/<port>/          interface + demo + (later) real implementations
  db/                       drizzle schema, migrations, seed
  jobs/                     pg-boss workers (thin; call services)
  plugins/                  auth, errors, rate limit
```

Direction: `route → service → repository → db`. Services may use adapters and shared rules. Routes never touch repositories or db. Cross-module calls only via `modules/<x>/index.ts` (service), never another module's repository.

## Key flows

- **Stock hold:** payment start → conditional `UPDATE inventory SET reserved = reserved + q WHERE on_hand - reserved >= q` + `stock_hold(expires_at = now + 5m)` + pg-boss job at expiry. Expiry releases and marks hold expired. Late gateway success → try allocate, else refund (D-59).
- **Flash sale:** same conditional update against `flash_sale.cap - sold`; per-customer limit via unique `(flash_sale_id, customer_id)`; rate limit + bot check on the route.
- **Serviceability / delivery estimate:** pure rule over (pincode/pin, category, warehouse stock, lanes) → `{deliverable, codAllowed, dateRange}`; recomputed on address change.
- **Owned devices:** derived from delivered order items (view), not stored.

## Testing

Vitest everywhere. Rules: unit tests (required, high coverage). API: service tests + route tests against a Docker Postgres. Web: RTL + vitest-axe per component. `pnpm check` = lint + typecheck + test + depcruise. Run by lefthook pre-push. No CI.

## SEO later

Production blocker (D-162). Kept cheap: one URL per product/category, title/meta set in one place (route `head` helper), semantic HTML, no content behind client-only state.

| Option | What | Cost |
|---|---|---|
| Prerender | Build-time/static HTML for product + category URLs (e.g. a crawler-prerender step or static generation from API) | Low. Stale between builds; fine for catalog pages |
| SSR | Move to a server-rendered framework (e.g. TanStack Start) | Higher. New runtime, hosting, data-loading rework; best freshness |

Recommendation when needed: prerender first.
