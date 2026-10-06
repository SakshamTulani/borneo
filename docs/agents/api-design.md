# API design

- REST over JSON. Plural nouns: `/products/:slug`, `/cart/items`. Customer-owned resources under `/me/…` (`/me/orders`), never `/customers/:id`.
- Every route declares Zod `params`, `querystring`, `body` and `response` schemas. Response schemas strip unknown fields.
- Shared contracts (DTOs used by web and api) live in `@borneo/shared`; web `api/` parses responses with them.
- Money fields end in `Paise` and are integers. Dates are ISO 8601 strings in UTC; delivery estimates are `{ from, to }` date ranges (D-52).
- Errors: `{ error: { code, message, details? } }` with stable `code` (e.g. `NOT_DELIVERABLE`, `HOLD_EXPIRED`, `OFFER_NOT_STACKABLE`). 400 validation, 401 no session, 403 not yours, 404 not found (also for other customers' resources), 409 stock/hold/limit conflicts, 422 rule violations.
- Lists: `?cursor=&limit=` (max 50); response `{ items, nextCursor }`.
- Filters on category listing are query params named by category config attribute keys.
- Idempotency: payment start and order placement accept an `Idempotency-Key` header.
- Rate limits on auth and flash-sale checkout (D-143).
- No endpoint returns another customer's data; scoping lives in repositories (ADR-0005).
