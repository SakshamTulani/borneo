# Backend architecture (apps/api)

Fastify + Zod type provider + Drizzle/Postgres. Fastify is the only backend (ADR-0008). Enforced by `pnpm depcruise` and `pnpm check:rules`.

## Layout

```
src/main.ts             loads env, creates db, wires services, listens
src/app.ts              buildApp(deps): composition root, registers module routes + error handler
src/services.ts         binds repositories to a db; appDeps(db, config) wires the whole app (main, tests)
src/env.ts              Zod env; refuses DEMO_MODE in production (D-165)
src/errors.ts           AppError(status, code, message); services throw these
src/plugins/errors.ts   renders every error as { error: { code, message, details? } }
src/reset.ts            resetDatabase: drop, migrate, seed, materialise relations (refused in production)
src/db-reset.ts         `pnpm db:reset` entry
src/modules/<m>/
  <m>.route.ts          HTTP: Zod schemas, auth guard, reads session, calls service
  <m>.service.ts        orchestration: shared rules + repositories + adapters
  <m>.repository.ts     Drizzle queries only
  <m>.schema.ts         request/response Zod (leaf)
  index.ts              public exports
src/db/                 client, schema/ (Drizzle, one file per area), seed/ (data + buildSeed)
src/session/            the only code that reads the session: Better Auth config, IdentityPort impl, SessionReader
src/adapters/<port>/    interface + demo impl (+ real impl later) (ADR-0003)
src/jobs/               pg-boss workers; thin, call services (ADR-0004)
src/test/               factories, globalSetup (seeded test DB), useTestDb()
drizzle/                generated migrations; commit them
```

Reference modules: `src/modules/health` (minimal), `src/modules/catalog` (DB-backed, filtered keyset pagination, error codes). `src/modules/offers` exposes `loadOfferBook` (injected into catalog) and `GET /offers/live` (home strip, D-191). `src/modules/search` reuses the catalog's `summarize` (injected) so results price like listings. `src/modules/delivery` composes serviceability, stock, lanes and flash state into the PDP estimate and resolves map pins to pincodes. `src/modules/cart` (Phase J) prices carts from the shared `priceCart` on every read: `POST /cart/quote` for browser carts (signed out, nothing stored) and `/me/cart` for account carts (changed in one transaction under a lock on the cart row via `changeCart(customerId, db, change)`); it composes catalog facts (`loadCartItems`, `loadCartBundles`, `summarize`), offers, delivery (`check`) and relations for suggestions. `src/modules/relations` has no routes; the reset script and (later) jobs call it.

Auth (Phase I): Better Auth is a library behind `IdentityPort` (declared in `modules/auth`, implemented in `src/session/betterAuth.ts`); its HTTP handler is **not** mounted, so every auth route keeps our Zod contracts, error shape and rate limits (D-190). Session cookies pass through the service as opaque `Set-Cookie` strings. Customer routes call `requireCustomerId(session, request)`; tests swap in `headerSession` (`x-test-customer`) or use real sign-in. `modules/addresses` and `modules/notifications` are the customer-scoped references (cross-customer tests at repository and route level). Outbound messages go through `adapters/notifications` (demo: inbox + log + on-screen box; otherwise inbox + log until D-104); secrets such as reset codes never reach the inbox or log (D-98). `plugins/origin.ts` refuses cookie-authenticated writes from other origins; `plugins/rateLimit.ts` is in-memory (one process).

## Rules (enforced)

- `route → service → repository → db`. Routes never import repositories or `db/`. Only repositories import `db/`.
- Services never import routes; repositories never import services/routes; schemas import no layer.
- Other modules: only via `modules/<x>/index.ts`.
- Services and repositories never import `src/session/`. Routes resolve `customerId` and pass it down.
- A repository mentioning `customerId`/`customer_id` is customer-scoped: every exported function takes `customerId: CustomerId` first, and the module has `<m>.cross-customer.test.ts`.
- Module folders contain only route/service/repository/schema/index files (plus tests).

## Shared rules (`@borneo/shared`)

Services call these; never re-implement them. Each cites its `D-xx` IDs.

| Need                                 | Function                                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Price shown on PDP/cards             | `priceDisplay` (selling price, savings, effective price, EMI from)                                                                                        |
| Order totals with offers             | `priceOrder` (1 coupon + 1 payment offer, per-line shares)                                                                                                |
| Cart                                 | `priceCart`, `normalizeEntries`, `addEntry`, `mergeCarts`, `lineStatus`, `pricingLines`, `cartEmiFrom`, `combineDeliveries`, `cartReady`, `bundleOffer`   |
| Delivery estimate / not deliverable  | `deliveryEstimate`, `addressNeedsRecheck`, `nearestPincode`, `distanceKm`                                                                                 |
| COD and payment methods              | `codEligibility`, `allowedPaymentMethods`                                                                                                                 |
| 5-min stock hold, late payment       | `startHold`, `holdStatus`, `resolvePaidOrder`                                                                                                             |
| Flash sale state and purchase        | `flashState`, `unitPriceWithFlash`, `canBuyFlash`, `lowStockCount`                                                                                        |
| Returns                              | `returnPolicyFor`, `returnWindowEndsAt`, `canRequestReturn`, `policySummary`                                                                              |
| Upgrade badge / strip                | `upgradeBadge`, `upgradeStrip`                                                                                                                            |
| Compatibility, relations, cross-sell | `compatibilityFacts`, `materializeRelations`, `pickSuggestions`                                                                                           |
| Cancel, Watch                        | `canCustomerCancel`, `canWatch`                                                                                                                           |
| Listing, PDP display                 | `parseListingFilters`, `filterFacets`, `specGroups`, `formatAttributeValue`, `variantAvailability`, `productAvailability`, `cardVariant`, `productOffers` |
| Search reading and ranking           | `searchIntent` (normalise, price intent, synonyms), `namedCategory`, `exactMatch`, `keepRelevant`                                                         |

Rules take `now` as a parameter: services pass the clock, so rules stay pure and testable.

## Rules (review)

- Dependencies are injected: services get repository functions/adapters via a `create<M>Service(deps)` factory; `main.ts` wires real ones, tests wire fakes.
- No business rules in routes or repositories; call `@borneo/shared` rules from services.
- Money: integer paise end to end (ADR-0006). No floats, no `numeric` → JS number conversions without the money helper.
- Stock changes use one conditional `UPDATE … WHERE available >= qty` (no read-then-write).
- External effects (email, payment, analytics, courier, bot check) only through adapters. Demo adapters selected by `DEMO_MODE`.
- Migrations: change `src/db/schema`, run `pnpm db:generate`, commit SQL + meta. Never edit applied migrations.
- Seed data is validated before insert (`seedIssues`). Add a check there when a new invariant appears; the planted-fault tests in `seed.test.ts` prove each check.
- Relations are never edited by hand: change rules/overrides, then rematerialise (`relations` service).
