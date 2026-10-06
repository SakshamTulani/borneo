# Progress

| Date       | Phase | Branch                  | Done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Next                                       |
| ---------- | ----- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 2026-10-06 | A     | `phase-a/docs`          | First commit on `main` (.gitignore). Docs + 7 ADRs. Owner accepted ADR-0001…0007.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                          |
| 2026-10-06 | B     | `phase-b/skeleton`      | ADR-0008 (Start SSR) accepted, supersedes 0001. Monorepo, tooling, boundaries + canaries, rule checks, Docker, drizzle-kit, SSR shell, agent docs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                          |
| 2026-10-06 | C     | `phase-c/design-system` | Mutation hook naming (D-174). 5 skills + 2 subagents. Validator proof (6/6 caught). Tokens, shadcn base, feedback + commerce components, noindex `/design-system`. 130 tests. `pnpm check` green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Owner review; then Phase D (shared rules)  |
| 2026-10-06 | D     | `phase-d/shared-rules`  | Money helpers, IST time, Zod contracts, 14 pure rule modules. 110 tests named by D-xx, coverage 99.4% stmts / 97.8% branches (gate ≥ 90%). New `rule-ids` check. Architecture-reviewer pass: 11 findings fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Owner review; then Phase E (DB + seed)     |
| 2026-10-06 | E     | `phase-e/db-seed`       | Drizzle schema (37 tables, CHECKs for never-break invariants), migrations 0000 pg_trgm + 0001 schema, validated seed (7 categories, 45 products), relation materialiser, `GET /categories` + `GET /products`, `pnpm db:reset`, seeded test DB. 58 API tests. Architecture-reviewer pass: 18 findings fixed.                                                                                                                                                                                                                                                                                                                                                                                                                            | Owner review; then Phase F (browse)        |
| 2026-10-06 | F     | `phase-f/browse`        | Home (hybrid), header + mobile bottom nav, `/categories`, category page (config filters + sort in URL, keyset paging), PDP template. API: `GET /categories/:slug`, filtered `GET /products`, `GET /products/:slug`. D-18, D-19. Migration 0002. Reviewer pass: 6 findings fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Owner review; then Phase G (search)        |
| 2026-10-06 | F     | `phase-f/browse`        | Owner: photos + product-led home. Sample photos for all 45 products (`media.url`, migration 0003, D-180), `image`/`images` in contracts, responsive `imageSource`, PDP gallery, photo cards and category tiles. Home: product hero (newest launch), launches grid, category banners (D-181). ADR-0009 revised.                                                                                                                                                                                                                                                                                                                                                                                                                         | Phase G (search)                           |
| 2026-10-06 | G     | `phase-g/search`        | Shared search rules (normalise, price intent incl. Hinglish, plural-aware synonyms, named category, exact model/SKU, relevance cut). `GET /search` (pg_trgm `word_similarity`, exact-match candidates incl. discontinued, D-114 fallback). Web: header combobox with instant suggestions, `/search` (exact match → PDP redirect, noindex), mobile Search tab. D-182, D-183.                                                                                                                                                                                                                                                                                                                                                            | Owner review; then Phase H                 |
| 2026-10-06 | H     | `phase-h/delivery`      | `GET /delivery` (date range, place, COD with reason; pre-order window and cap), `GET /pincodes/at` (map pin → nearest pincode), `pincode_area` (migration 0004). PDP delivery checker with remembered pincode and client-only Leaflet map dialog. Base `Dialog`. FAQ content corrected against product data; studio category tiles. D-184–D-187. Reviewer pass: 12 findings fixed.                                                                                                                                                                                                                                                                                                                                                     | Owner review; then Phase I (auth)          |
| 2026-10-06 | I     | `phase-i/auth`          | Better Auth behind our own routes (sign-up/in/out, session, 6-digit reset code), demo box via NotificationAdapter, account inbox, address book with exact map pin, account shell, header account link + mobile Account tab, PDP uses default address pincode (D-185). Owner requests: two-row desktop header, live offers strip under the home hero (D-191). Migration 0005. D-97–99, D-188–191.                                                                                                                                                                                                                                                                                                                                       | Owner review; then Phase J (cart)          |
| 2026-10-06 | J     | `phase-j/cart`          | Shared `priceCart` (one live flash unit then regular, coupon kept with reason, coupon and payment-offer previews, cart EMI, line status, bundle offers). `POST /cart/quote` (browser cart) + `/me/cart` (lines, coupon, merge; locked writes), delivery and COD per pincode, add-on suggestions with one-tap add. Web: PDP add to cart, sticky bar, in-cart stepper, bundles, add confirmation, `/cart`, header + bottom nav count. Owner: demo reviews (D-200) with a review list on the PDP; in-cart stepper on the PDP. Migrations 0006–0008. D-192–D-200.                                                                                                                                                                          | Owner review; then Phase K (checkout)      |
| 2026-10-07 | K     | `phase-k/checkout`      | Checkout on the account cart: address (default first), method, bank, EMI plan and one optional payment offer in the URL; recheck on every change (D-55, D-201, D-202). In-checkout sign-up (D-92). Idempotent placing with total check; reservation per item at the fastest warehouse with stock, pre-order cap, flash cap + purchase row, all-or-nothing (D-203). Prepaid: 5-minute hold, mock gateway (pay / fail / late success), retry within the hold, pg-boss expiry + lazy expiry, late payment re-reserve or refund (D-204–D-213). COD confirmed at once. Confirmation page, inbox messages, GST invoice PDF (in-house writer, D-208–D-210). Migration 0009. Owner request: home offers ticker + shipping line (D-191, D-214). | Owner review; then Phase L (post-purchase) |

## Phase K: checkout & payment

**Runnable:** `pnpm install && pnpm db:reset && pnpm dev` (`DEMO_MODE=true`; or `pnpm db:migrate` to keep data: the dev DB was migrated and its warehouse states and HSN codes backfilled in this session). Signed out: add `/products/pulse-4` to the cart → `/cart` → "Check out" → create the account inside checkout (email + password, then the address with its pin) → checkout shows delivery dates per item at that address. Choose "Cash on delivery" → "Place order" → confirmation with delivery estimate and "Download invoice". Again with UPI → "Pay ₹…" → payment page with the 5-minute countdown and the demo gateway: "Pay" confirms; "Payment fails" then "Try paying again" (same timer); "Succeeds after the hold ends" waits for the timer, shows the order cancelled with the stock returned, then confirmed (or refunded, if the stock went meanwhile) about 10 s later. Card + HDFC with the HDFC offer, or EMI with a plan, shows the saving / instalment. Flash item (`/products/echo-buds-2?variant=EB2-BLK`): COD is unavailable with the reason; a second flash order is refused (limit 1).

| Piece        | Where                                                                      | Notes                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared rules | `rules/checkout.ts`, `contracts/checkout.ts`, `warehousesBySpeed`          | `checkout` (methods, plans, offers, totals, blocks), `orderLines` (flash unit, bundle members, discount shares), numbers, GST split, notices                    |
| Orders API   | `modules/orders`                                                           | `GET /me/checkout`, `POST /me/orders` (Idempotency-Key), `GET /me/orders/:id`, retry, demo mock, invoice PDF; cross-customer tests                              |
| Reservation  | `placeOrder`, `expireHold`, `settleLatePayment`                            | One transaction per order; conditional updates only; flash purchase row is the limit; release returns stock, caps and the flash row                             |
| Jobs         | `src/jobs` (pg-boss 12, schema `pgboss`)                                   | `hold-expiry` at the hold's end, `mock-late-payment`; workers call the service; checked live against the dev DB                                                 |
| Payments     | `adapters/payments`                                                        | Mock gateway in demo; none otherwise (prepaid refused, D-74)                                                                                                    |
| Invoice      | `src/documents` (`pdf.ts`, `invoice.ts`)                                   | A4, Helvetica, CGST+SGST or IGST per line, multi-page, demo watermark; rendered from snapshots                                                                  |
| Data         | migration 0009                                                             | Category HSN + GST rate, warehouse state + GSTIN, order discount parts / bank / tenure / notice, item tax snapshot, invoice states, order and invoice sequences |
| Web          | `features/checkout`, routes `/checkout`, `/checkout/$orderId/pay`, `/done` | Choices in the URL, in-checkout sign-up, payment page polling, confirmation; cart "Check out" for everyone                                                      |

**Validators:** shared tests per D-xx (D-35, D-36, D-45, D-46, D-55, D-57, D-59, D-70, D-71, D-194–D-196, D-198, D-201–D-203, D-207–D-209); orders route tests on the test DB (COD, prepaid hold of exactly 5 min, mock success + invoice PDF, failure + retry within the same hold, hold expiry returning stock, late payment confirm and refund with inbox messages, idempotency, price change, COD refused, flash limit, no gateway outside demo, fastest-warehouse choice); **concurrency: 6 parallel orders on 2 units → exactly 2 placed, reserved = 2**; jobs scheduled at the right times; cross-customer tests (repository and routes); PDF writer (xref offsets, escaping, pages) and invoice tax; seed planted fault for tax data; web tests with axe for checkout (signed in, signed out sign-up, email taken, offers, EMI, COD reasons, Idempotency-Key, price change), payment page (gateway, retry, expired, refunded) and confirmation. End-to-end through the Vite proxy (python): sign-up, address, cart, COD order, UPI order + mock pay, invoice download, SSR pages 200.

**Review (architecture-reviewer subagent), all fixed with regression tests:** a payment at the hold's end could confirm with nothing reserved (claim, confirm and late settlement are now one locked transaction; `resolvePaidOrder` takes `holdReleased`, D-212); a failure after commit could lead to a duplicate order (expiry scheduled first, post-commit steps best effort, the browser keeps its Idempotency-Key unless the API answered 4xx); a claimed payment could go unsettled (same transaction); invoices used one warehouse's state for every line (tax per line now, D-209); confirmation removed units added during the hold (subtracts quantities, D-207); cancelled orders were polled forever (stops a minute after the hold window). The orders suites now run on a copy of the seeded test DB (`useTestDb('orders')`) so catalog suites listing everything never see their fixture products.

**Changed from earlier phases:** `deliveryEstimate` uses `warehousesBySpeed` (same order). `paymentReason`/`samplePayment` exported from the cart rules. The cart service exposes `forCheckout` / `removeOrdered`. `sendJson` takes headers. `invoice.s3_key` is nullable (conflict 27). The cart's checkout button links to `/checkout` for everyone (conflict 28). Addresses "Add an address" returns to checkout when opened from it. `testApp` takes a clock.

**Not done (noted):**

- Order history, tracking, cancel, returns, review prompts: Phase L. The confirmation page links to the inbox; there is no orders list yet.
- Flash-sale rate limit and mock bot check on checkout: Phase N (limit 1, cap and disposable-email block are enforced now).
- No cross-sell on the confirmation page yet (D-123 allows it; D-73 keeps it out of payment).
- Orders mixing a pre-order and in-stock items are one order marked pre-order, with no COD and no invoice until it ships.
- COD order-value cap (D-72) is still open; `codEligibility` takes it when decided.

**New assumptions:** D-201–D-213 (checkout, orders, invoices), D-214 (shipping line). New production blockers: mock gateway and refunds (D-213); real GSTINs and HSN/GST reviewed by an accountant (D-209, D-210).

## Phase K: risks

- **No-cost EMI arithmetic.** The discount is the plan's interest on the full price (D-45, Phase D); a bank charging interest on the reduced amount gives instalments about ₹50 off price ÷ months on ₹26,000 over 6 months. Checkout shows price ÷ months as D-45 says. A real bank's formula should replace this.
- **pg-boss lag.** A hold is released when its job runs (polling ~2 s) or when the order is next read. Until then that stock looks taken in carts.
- **Sequences can skip numbers** when a transaction rolls back (e.g. a reservation conflict). GST wants consecutive invoice numbers; invoices only take a number inside a successful transaction, but confirm the policy with an accountant.
- **Hand-written PDF.** Text only, standard fonts (no ₹ glyph, no non-Latin names). A library would need an ADR.
- **Mock late payment** runs as a pg-boss job; a stopped API delays it until restart.

## Phase J: cart & offers

**Runnable:** `pnpm db:migrate && pnpm db:reset && pnpm dev`. Signed out: `/products/echo-buds-2?variant=EB2-BLK` → "Add to cart" (confirmation with add-on suggestions, each with a reason and its own Add button) → the buy box now shows "In your cart" with a stepper; add again with the stepper to see one unit at the flash price and the rest regular. `/products/pulse-4` → "Buy together" → "Add bundle". `/cart`: enter `560034` (dates per line, COD off because of the flash unit), try `WELCOME500`, `AUDIO10` (refused with the reason when only flash or bundle lines qualify), see payment offers as what they'd save. "Sign in to check out" → sign up → the browser cart merges into the account. `744101` with a TV shows "We don't deliver this to your pincode" and holds checkout.

| Piece        | Where                                                                                             | Notes                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared rules | `rules/cart.ts`, `contracts/cart.ts`                                                              | Line keys `item:<SKU>` / `bundle:<slug>`; limits 5 per line, 20 lines (D-193); merge (D-192); flash unit (D-194); coupon state and previews (D-195, D-196)                                                                       |
| Cart API     | `modules/cart`                                                                                    | Quote (stateless), account cart under a row lock; add refuses unknown, not-for-sale, out-of-stock and over-supply lines; 422 for a coupon that doesn't apply                                                                     |
| Catalog      | `loadCartItems`, `loadCartBundles`, `soleVariantSkus`, bundles on PDP                             | Bundle saving against members' regular prices (D-197); cart suggestions carry `addKey` only for single-variant products in stock                                                                                                 |
| Data         | migrations 0006–0007                                                                              | `cart.coupon_code`, `cart_item.created_at`, qty 1–5, one line per item; `flash_sale_id` dropped (prices never stored)                                                                                                            |
| Web          | `features/cart`, `shared/ui/commerce/QuantityStepper`, `StickyPurchaseBar`, `navigation/CartLink` | Browser cart in localStorage, merged once after sign-in; in-cart stepper on the PDP (owner request); `/cart` noindex                                                                                                             |
| Demo reviews | `db/seed/reviews.ts`, `buildSeed`                                                                 | 24 demo customers, 232 reviews on delivered demo orders (D-200); none on the pre-order. PDP (owner request): star breakdown, newest 6 server-rendered (first name + initial, "Verified purchase"), "Show more reviews" by cursor |

**Validators:** shared rule tests per D-xx (D-36, D-39, D-47, D-55, D-65, D-140, D-142, D-146, D-148, D-192–D-199); cart route tests on the seeded DB (flash split, limits, refusals, coupon kept/not applied, payment previews, delivery and COD, bundle line, merge, parallel adds, foreign origin 403); cross-customer tests (repository and routes); service tests with fakes (bundle delivery per member, COD reasons, 21st line, coupon refusal); schema tests for 1–5 units and no stored price; seed tests for demo reviews; web tests with axe for the cart page (guest, empty, signed in), PDP purchase (add, in-cart stepper, failure, pre-order, out of stock), bundles, stepper, sticky bar, nav count. End-to-end through the Vite proxy (python): quote with flash and bundle, sign-up, merge, quantity, refused coupon, over-supply add.

**Changed from earlier phases:** `cart_item.flash_sale_id` and its D-39 check dropped (D-194: flash price decided on read). `pickSuggestions` keeps add-ons only on add-to-cart and cart (D-199). `sendJson` accepts DELETE. `ProductDetail` has `bundles`. The bottom nav has five tabs. D-150 now has a demo exception (conflict 25).

**Not done (noted):**

- Checkout (Phase K): the signed-in "Checkout" button is disabled with a note. Mixing a pre-order with in-stock items in one cart is allowed; K decides how it checks out (one order is either a pre-order or not).
- Owned devices aren't excluded from suggestions yet (no real orders until K; D-126).
- The header count reads the full cart (one request per page load when signed in).

**New assumptions:** D-192–D-199 (cart), D-200 (demo reviews, production blocker).

**Dev database note:** `pnpm db:reset` for the reviews wiped dev accounts. Forgotten-password codes only show for an email that has an account (D-98), so sign up again first.

## Phase I: auth & account shell

**Runnable:** `pnpm db:migrate && pnpm dev` (or `pnpm db:reset`). With `DEMO_MODE=true`: `/sign-up` → account → Addresses → "Add an address" (pincode `560034` fills city/state; "Place pin on map") → back on `/products/pulse-4` the delivery checker starts from that pincode. Sign out → `/forgot-password` → the demo box shows the 6-digit code ("Use this code") → set a new password → sign in → Inbox shows "Reset requested" and "Password changed" (never the code). Home: offers strip under the hero; desktop header now has categories on a second row.

| Piece         | Where                                                    | Notes                                                                                                                                          |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `src/session/betterAuth.ts`, `modules/auth`              | Better Auth as a library (handler not mounted): our contracts, error codes (`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `INVALID_CODE`), rate limits |
| Session       | `src/session/index.ts`                                   | `requireCustomerId`; cookie `borneo.session_token`, HttpOnly, SameSite=Lax, 7 days (D-97)                                                      |
| Notifications | `adapters/notifications`, `modules/notifications`        | Demo: inbox + log + on-screen box; otherwise inbox + log (D-104 blocker). Inbox paged by keyset, mark read / all                               |
| Addresses     | `modules/addresses`, shared `rules/addresses.ts`         | Up to 20, one default (DB partial unique index), delete promotes newest, pin in India and ≤ 50 km of a known pincode                           |
| Web           | `features/auth`, `account`, `addresses`, `notifications` | RHF + shared Zod; SSR forwards the cookie (`shared/lib/ssrRequest.ts`); `/account` guarded, sign-in redirect same-site only                    |
| Shared UI     | `shared/ui/forms`, `shared/ui/map`                       | Form fields, PinPickerDialog (delivery and addresses share it); specimens on `/design-system`                                                  |
| Offers strip  | `GET /offers/live`, `features/offers`, rule `offerStrip` | Live flash sales (link to the sale variant), bank / no-cost EMI, coupons; real terms and end dates; nothing upcoming or sold out               |
| Security      | `plugins/origin.ts`, `plugins/rateLimit.ts`              | Writes from other origins → 403; auth limits per D-190 (in memory)                                                                             |

**Validators:** cross-customer tests for addresses and notifications (repository and route); real Better Auth route tests on the test DB (sign-up/in/out, duplicate email, unverified email in demo D-93, reset with demo code, 3 wrong tries kill the code, new code replaces old, sessions revoked, inbox never holds the code, 429s); D-165 tests that the demo box is absent when `DEMO_MODE=false` (API and web); web tests with axe for every new page/component state; D-185 default-pincode test; noindex heads for account and auth pages. End-to-end run through the Vite proxy (curl/python): guards, SSR with cookie, reset, address save, inbox, foreign-origin 403.

**Reviewer findings fixed:**

1. Rate limits saw only the proxy's IP (site-wide sign-up cap; anyone could lock an email out of sign-in). The API now trusts `X-Forwarded-For` from configured proxies only (`TRUST_PROXY`), the dev proxy sends it, and tests prove separate budgets per client.
2. `safeRedirectPath` accepted `/\t/evil` (browsers turn it into `//evil`). Control characters are refused and the path is resolved against a fixed origin.
3. Pages rendered with a session (every page now carries the account link) had no cache header. They are now sent `private, no-store`.
4. D-98's "same answer" doesn't hold in demo (the box appears only for real accounts). This is now recorded as a demo exception, with a non-demo test that the answers are identical.
5. A password reset left this browser's cached session behind, so the redirect bounced to `/account` and returned 401. The reset now clears the session the same way sign-out does.
6. Missing tests: the 7-day cookie, the sign-up and reset-attempt limits, and sign-out without a session (this already worked; Better Auth clears the cookies).
7. Limiter pruning used the triggering rule's window, so it reset longer windows early. Each entry now keeps its own window, with a hard cap on entries.
8. Address saves raced (two first saves both tried to become the default, giving a 500; the 20 limit could be passed in parallel; delete-then-promote wasn't atomic). The count and insert, and the delete and promote, now each run in one transaction under a lock on the customer row; the shared rules decide inside it.
9. Flash tiles compared the sale price with MRP. They now compare with the normal selling price ("Usually ₹X"). Terms say "₹X or more" (matches the rule), coupons say "not on flash sale or bundle prices", and the strip refetches when an offer ends.
10. Small rules in the UI now call the shared ones: `canAddAddress`, `isDefaultOnAdd`, and the new `startingPincode` for D-185.
11. The inbox shows when marking as read fails, and each "Mark as read" button is described by its message. The notifications clock is injectable. The D-185 rewording is logged as conflict 24.

**Changed from earlier phases:** `customer_profile` dropped (name/phone live on the Better Auth user; it had no data or code). `customer_id` now references `user.id` everywhere. Map dialog split into shared `PinPickerDialog` + thin delivery wrapper. Sticky panels moved to `lg:top-32` for the two-row header.

**Not done (noted):**

- Profile editing (name, phone, email change) and account deletion.
- Checkout sign-up (D-92) comes with Phase K; the sign-up page stands alone for now.
- Rate limit counters are per process; a multi-instance deploy needs a shared store. The production host must forward `X-Forwarded-For` and be listed in `TRUST_PROXY` (part of D-175).
- The map pin flow is tested with a stand-in map; not exercised in a real browser this phase.

**New assumptions:** D-97 (passwords, sessions), D-98 (reset code), D-99 (mobile format), D-188 (address book), D-189 (pin check), D-190 (rate limits), D-191 (offers strip). D-185 reworded (default address takes over).

## Phase H: serviceability & delivery

**Runnable:** `pnpm db:migrate && pnpm db:reset && pnpm dev`, then `/products/pulse-4` → type `560034` and press Enter (1–2 days, COD). Try `744101` (phones prepaid only; TVs not deliverable), `171001` (Shimla: known, not served), `/products/nova-4` (pre-order: dispatch window + lane, no COD), `/products/echo-buds-2` Black (live flash sale: no COD). "Choose on map" → pan with mouse or arrow keys → "Use this location".

| Piece        | Where                                              | Notes                                                                                                                       |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Shared rules | `rules/serviceability.ts`, `contracts/delivery.ts` | Pre-order range uses the whole dispatch window (D-64); `nearestPincode` + `distanceKm` (D-184); `deliveryCheckSchema`       |
| Delivery API | `modules/delivery`                                 | Estimate + COD line (D-186: pincode, pre-order, live flash); pre-order qty vs remaining cap (D-65); bounding-box pin lookup |
| Data         | `pincode_area`, seed `logistics.ts`                | 24 served + 2 unserved pincodes with centres; `seedIssues` catches duplicate pincodes and unknown category overrides        |
| Web          | `features/delivery`, `shared/ui/base/dialog.tsx`   | Checker on PDP (slot in `ProductView`), pincode remembered per browser (D-185), map dialog loads Leaflet only when opened   |
| Map tiles    | `shared/lib/mapTiles.ts`                           | Public OSM tiles outside production builds only; production needs `VITE_MAP_TILE_URL` or the map is hidden (D-187)          |

**Validators:** D-50–55, D-62–65, D-70–71, D-146, D-184 tests across rules, service (fakes) and routes (seeded DB, `TEST_NOW`); web tests for each checker state with axe, keyboard path (type + Enter, no map), paste with spaces, retry after failure, remembered pincode, variant change, map pick and "no pincode here". Endpoints checked with curl on the dev API; SSR PDP renders the checker idle.

**FAQ fix (owner request):** every FAQ checked against attributes, return policy and explainer. Category FAQs show on every product in the category, so they must hold for all of them. Unbacked claims removed (Pulse 4 dual SIM, Nova 3 "15 W" wireless, "1 m" cable, USB PD, hub runs offline); Pulse 4 update policy matched to its spec; Indoor Camera "no Google Home" added.

**Reviewer findings fixed:**

1. "Check" after a failed check did nothing (same query key); now refetches.
2. Result messages quoted the field after later edits; they now name the checked pincode.
3. `maxLength=6` cut a pasted "560 001"; the field now keeps digits only.
4. Pre-orders ignored the requested quantity against the remaining cap (D-65).
5. Public OSM tiles were hard-coded; now configurable and off in production builds without a provider (D-187).
6. D-166 said serviceability is an adapter; reworded (DB config) and logged as conflict 23.
7. Map focus survived closing the dialog and was lost if set before Leaflet loaded.
8. Keyboard-without-map path had no test; test labels D-17/D-55 corrected; seed checks for pincode data; stale-time shortened so COD follows a flash sale going live; D-61 note on the qty bound.

**Not done (noted):**

- The map itself is verified only through a stand-in in tests and a production build (Leaflet in its own lazy chunk); not exercised in a real browser.
- Only seeded pincodes resolve from a pin; a full pincode directory is a launch blocker (D-166, D-184).
- Listing cards still don't use the pincode (D-54): availability by pincode is PDP-only.
- Category tiles from the new image set are not resized by their host (~400 KB each, lazy-loaded).

**New assumptions:** D-184 (pin → nearest pincode within 15 km), D-185 (pincode remembered per browser), D-186 (PDP COD line), D-187 (map tiles; blocker).

## Phase F: browse

**Runnable:** `pnpm db:reset && pnpm dev`, then `/` → a category (try filters and sort; they live in the URL) → a product (`?variant=SKU` keeps the choice). `/products/pulse-3` shows a discontinued page; `/products/nova-4` a pre-order.

| Piece         | Where                                                    | Notes                                                                                                             |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Shared rules  | `rules/catalog.ts`, `productOffers` in `rules/offers.ts` | Filters parse (D-18), facets, price caps, spec groups, value formatting, availability (D-65), card variant (D-19) |
| Catalog API   | `modules/catalog`, `modules/offers` (repository only)    | Filters are SQL on jsonb, bound params, keys allowlisted by config. Cursor = sort key + slug.                     |
| Option labels | `attribute_def.option_labels` (migration 0002)           | `usb_c` → "USB-C" in specs, facets and compatibility facts                                                        |
| Web features  | `features/catalog`, `features/product`                   | Loaders prefetch (infinite list too); views are prop-driven and tested with axe                                   |
| Navigation    | `shared/ui/AppShell`, `shared/ui/navigation/`            | Skip link, sticky header with category links (desktop), bottom nav (mobile), breadcrumbs                          |
| SEO           | `shared/lib/seo.ts`                                      | Title, description, canonical, Open Graph per route. Filtered and variant URLs share the base canonical.          |

**Validators:** axe on home, category (list, loading, error, empty), PDP (live, flash, pre-order, discontinued), nav; filters-in-URL tests (parse, toggle, chips, API params); route head tests; API tests for each D-18 filter kind, sorts, paging without gaps for every sort, flash pricing, PDP sections, 404/400 codes. SSR checked with curl: real `<title>`, canonical and OG in the HTML; unknown product/category returns 404 inside the shell.

**A test caught a real bug:** combined filters returned wrong products because drizzle's `and()` doesn't parenthesise `or` fragments. Every filter fragment is now wrapped.

**Reviewer findings fixed:**

1. A card could show a "Flash sale" badge from a variant other than the one it priced (D-140). The badge now comes from the priced variant.
2. Price filter steps were decided in the web app; now `priceCaps` (shared) returned by the API.
3. Option values the router parses as numbers/booleans were dropped from the URL.
4. Home had no empty/loading states for new launches, categories and entry points.
5. "Help me choose" copy promised side-by-side compare, which arrives in Phase M.
6. A price cap in the URL that the category doesn't offer showed a chip but not the select; now ignored everywhere.

**Not done (noted):**

- **No product images yet.** Waiting on ADR-0009. Cards and PDP show a neutral placeholder.
- No add-to-cart or sticky purchase bar (Phase J). Delivery checker and header search arrived in H and G.
- Home shows only the two entry points with real destinations (Help me choose, Build your setup), driven by `config.homeEntry`. Deals and Upgrade come with J/M/N.
- Card "In stock" means stock in any warehouse; pincode-level availability is on the PDP (Phase H, D-54), so cards don't badge "In stock".

**Design refresh (owner request, D-179):** restyled every token and component toward the Apple store reference, keeping Borneo green as the single accent: parchment canvas, white 18px hairline cards, pill buttons with press scale, 17px body and SF/Inter type (Manrope dropped), dark hero tile on home, frosted header and bottom nav, compact card prices. New `Select` (native, chevron inset; fixes the misplaced arrows) and `Container`. Fixed along the way: fieldset legends cutting through filter dividers, oversized badge icons, tailwind-merge dropping the custom type sizes. Verified each component and page with headless Chrome screenshots (desktop 1280 and real 390px viewports) plus render + axe tests.

**Product images:** ADR-0009 (S3 client + public MinIO prefix + generated renders) written as **proposed**; not built until you accept it.

**New assumptions:** D-18 (filter semantics), D-19 (newest-first default; card shows the lowest price payable now).

## Phase E: DB + seed

**Runnable:** `docker compose up -d && pnpm db:reset && pnpm dev`, then `GET /categories` (7 launch categories with config) and `GET /products?category=audio&limit=3&cursor=…`. Unknown category → `404 CATEGORY_NOT_FOUND`; `limit>50` → `400 VALIDATION`.

| Piece           | Where                                                  | Notes                                                                                                        |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Schema          | `apps/api/src/db/schema/*.ts`                          | Every DATA_MODEL table except Better Auth (Phase I). Invariants also as CHECKs.                              |
| Migrations      | `apps/api/drizzle/0000_pg_trgm.sql`, `0001_schema.sql` | Extension first, then trigram GIN indexes on product name, model number, SKU (ADR-0002).                     |
| Seed            | `apps/api/src/db/seed/`                                | Plain data + `buildSeed(now)`; `seedIssues` validates everything before insert. Stable name-based uuids.     |
| Materialiser    | `modules/relations`                                    | Rules ∪ line edges ∪ adds − removes, replaced atomically; 110 edges; reset fails on override conflicts.      |
| Catalog API     | `modules/catalog`                                      | Keyset pagination on slug, opaque cursor, cheapest-variant price + its MRP.                                  |
| Errors          | `src/errors.ts`, `src/plugins/errors.ts`               | `{ error: { code, message, details? } }` for every failure, incl. validation and unknown routes.             |
| Reset / test DB | `src/reset.ts`, `src/test/globalSetup.ts`              | Reset refuses production and non-local hosts. Tests get a fresh `<db>_test` per run, seeded with `TEST_NOW`. |

**Validators:** migrations applied = journal entries; pg_trgm + 3 trigram indexes present; seed has no issues, and one planted fault per check is caught (D-06, D-16, D-22, D-27, D-31, D-45, D-65, D-140, D-152, rule match types); constraint tests (D-22, D-31, D-39, D-41, D-50, D-54, D-65, D-71, D-88, D-140, D-142); relation rule/line/override tests on the seeded DB; materialise is idempotent.

**The seed validator caught a real bug on its first run:** smart-home compared on non-comparable attributes.

**Reviewer findings fixed:**

1. ICICI no-cost EMI rate (15%) differed from ICICI's 6-month plan (16%): customers would have repaid more than the price. Fixed, and `seedIssues` now checks every no-cost offer against the bank plans (D-45).
2. `placed_at`, `started_at`, `issued_at`, `updated_at` were all stored as `created_at`.
3. Manual relation reasons made claims no structured attribute backs (D-22); reworded to describe the suggested product.
4. Tests cited the wrong D-xx (D-24, D-56, D-71); relabelled, and real D-71/D-39/D-142/D-88 constraint tests added.
5. Money CHECKs added (no negative discounts/totals/amounts, order item price ≤ MRP).
6. Pre-orders could never be held (no stock, hold needs a warehouse): now a per-variant pre-order cap (D-65).
7. `idempotency_key` on order (unique per customer) and payment (api-design).
8. Relation rules: match kind now validated against attribute types.
9. `enum`/`list` attribute definitions must list options (D-16), in the shared contract.
10. `customer_id` is `text`, Better Auth's id type, so the Phase I FK needs no type change.
11. "First payment only" offer condition could not be modelled; dropped.
12. Stale copy in explainers ("Currently out of stock", wrong price claim).
13. Product listing could truncate pagination if a product had no variant; now one query with `DISTINCT ON`.
14. `db:reset` also refuses non-local databases.
15. More HTTP codes mapped (409/413/415/422/429); `AppError` carries `details`.
16. Missing false-attribute relation case tested; `relation_rule.match` parsed on read.
17. Coupon codes unique case-insensitively; cart lines unique (nulls not distinct); pincode CHECKs on address and warehouse; order item snapshots SKU, name, return policy (D-89, D-173).
18. DATA_MODEL shapes corrected (relation match, ETA columns).

**Not done (noted):**

- Table is still named `order` (reserved word). Drizzle always quotes it; raw SQL must too.
- Module `index.ts` files re-export repository functions for `src/services.ts`. A route in another module could import them through the index without depcruise noticing. Add a rule if it ever happens.
- Composite FK `(line_id, category_id)` not added; the seed checks line/category consistency instead.
- No media seeded yet (no image files); Phase F adds images to MinIO.
- `db:reset` will need to drop the `pgboss` schema once jobs land (Phase K).

**New assumptions:** D-16 (attributes match category definitions), D-17 (discontinued products leave listings, keep PDP + relations), D-65 (pre-order cap instead of warehouse stock).

**Local note:** `pnpm check` fails at `format:check` because of the untracked `conversations/` folder in the working tree (not part of the repo). Everything else is green.

## Phase D: shared rules

All in `packages/shared` (pure, no I/O; `now` is always a parameter). Function map: `docs/agents/backend-architecture.md`.

| Area                                 | Rules                      | Module                                      |
| ------------------------------------ | -------------------------- | ------------------------------------------- |
| Price display                        | D-30–33, D-42, D-47, D-140 | `pricing`, `emi`, `flash`                   |
| Order totals, stacking               | D-34–37, D-39–46           | `offers`                                    |
| Hold, late payment                   | D-56–59                    | `hold`                                      |
| Serviceability, delivery             | D-50–55, D-62–64           | `serviceability`                            |
| COD, payment methods                 | D-70–72, D-146             | `cod`                                       |
| Returns                              | D-80–89                    | `returns`                                   |
| Upgrade                              | D-24, D-121, D-130–138     | `upgrade`                                   |
| Flash                                | D-140–143, D-148           | `flash`                                     |
| Compatibility, relations, cross-sell | D-20–27, D-73, D-123–126   | `compatibility`, `relations`, `suggestions` |
| Cancel, Watch                        | D-146, D-147, D-149        | `orders`, `watch`                           |

**Gates added:** coverage ≥ 90% on rules (`pnpm test` fails below it). `check:rules` rule-ids: every D-xx a rule cites, including ranges like `D-30–33`, must exist in DECISIONS.md and have a test named `D-xx: …`. On its first run it caught 28 gaps (assumption IDs missing from DECISIONS, cited IDs without a test). All fixed.

**Reviewer findings fixed:**

1. No-cost EMI showed both a lower effective price and full-price instalments; now never an effective price (D-45).
2. No-cost "from ₹X/mo" ignored the offer's category scope and minimum.
3. COD method list could include COD on flash orders.
4. Return policy was hardcoded by category key; now category config (D-89).
5. Pre-orders were wrongly "out of stock".
6. `"false"` counted as "Works with X", and free text could be a compatibility fact.
7. Discount split could exceed a cheap line's value (negative net).
8. EMI float rounding is now documented in D-47.
9. `a@b@disposable.com` bypassed the disposable-email block.
10. The rule-id check ignored ranges.
11. Upgrade strip wording vs behaviour (D-136).

**New assumptions** (overrule anytime): D-27, D-42–47, D-62–64, D-87–88, D-126, D-136–138, D-148–149. The ones most worth a look:

- **D-45** (no-cost EMI model): the standard Indian bank-subvention model.
- **D-43** (coupon minimum counts only coupon-eligible items): excludes flash and bundle lines.
- **D-62** (no serviceability row = not deliverable): safe default, but seed data must be complete.
- **D-87** (return window ends at the end of the 7th IST day after delivery).

## Phase C: validator proof

Each fault was planted on a green baseline, run through `pnpm check`, then reverted. Afterwards `pnpm check` exit 0.

| Fault                                          | Caught by           | Message                                                                                         |
| ---------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| Lint: unused variable in `apps/api/src/app.ts` | `eslint`            | `'unusedFlag' is assigned a value but never used`                                               |
| Type: string into boolean in `toApiStatus.ts`  | `tsc` (web)         | `TS2322: Type 'string' is not assignable to type 'boolean'`                                     |
| Import: repository re-exports from ui          | `depcruise`         | `web-upward-from-repository: …/repository/healthRepository.ts → …/ui/ApiStatusBadge.tsx`        |
| Hook naming: `hooks/useHealth.ts`              | `check:rules` hooks | `file name must be use<Name>Query, use<Feature>Result, use<Feature>Form or use<Action>Mutation` |
| Malformed ADR: 0004 without `## Options`       | `check:rules` adr   | `0004-pg-boss-jobs.md: missing section "## Options"`                                            |
| Failing test: health service ignores DB state  | `vitest` (api)      | `expected "database": "down", received "up"`                                                    |

## Phase C: gaps found and fixed

- **Boundary blind spot (since Phase B).** dependency-cruiser didn't read package `exports`, so `@borneo/shared` and `@/` alias imports were invisible to every rule. Fixed with `exportsFields` plus `tsconfig.depcruise.json`. New `no-unresolvable` rule so this can't silently recur. Canaries now run the real CLI (incl. an `@/` alias case).
- **shadcn CLI** imported `cn` from an unrelated npm package named `cn` and installed it. Removed; local `@/shared/lib/utils`.
- **OS dark mode leaked** half-dark shadcn styles onto the light theme. `dark:` now requires a `.dark` class (D-176).
- **Offer colour failed contrast** on its soft fill (3.8:1). Darkened to `#9c4a1e` (D-178); the contrast test guards it.
- **No root error/not-found component**: a render error blanked the page. Added both to `__root.tsx`.
- `start` script pointed at a non-existent server; removed (D-175 open).

## Phase C: assumptions

- The design-system page is reachable in production but noindex. Gate or remove it before launch if you prefer.
- Inputs, buttons and selectable options are ≥ 44px tall everywhere (stricter than shadcn defaults).
- Countdown turns urgent under 1 minute (prop `urgentBelowMs`) and is announced once. Visual ticking is not announced.
- `formatInr` lives in `@borneo/shared` (money is shared); date formatting stays in web (presentation only, India time).
- ProductCard uses a plain `<a>` (stretched link). Route-aware links come with Phase F.
- Fonts are self-hosted via `@fontsource-variable` (no Google Fonts requests).

## Phase C: risks

- **Production hosting of Start is undecided (D-175).** The build emits a fetch handler, so a host adapter is needed before deploy.
- **Hydration and ICU.** Date and currency strings come from Intl on the server and in the browser. I normalise spaces, but a different ICU version could still change wording and cause hydration warnings. Countdown avoids this by rendering the absolute time until mount.
- **axe in jsdom does not check colour contrast or layout.** Contrast is covered by the token test, layout by manual screenshots (desktop 1280 and emulated 390 mobile, checked this phase). There is no automated visual regression yet.
- **shadcn upstream drift.** Re-running `shadcn add` can overwrite restyled base components. Diff before accepting.
- **The `/design-system` page is large** (one axe run takes ~1s). Fine now, but watch test time as it grows.
- **TS 6 pin (D-168)** must be revisited once typescript-eslint supports TS 7.

## Waiting on owner

- Review Phase D, especially assumptions D-43, D-45, D-62, D-87.
- Review Phase E, especially D-17, D-65 and the seeded catalog/offers.
- Review Phase F, especially D-18, D-19, D-179 (design refresh).
- Accept or reject ADR-0009 (revised: hosted sample photos now, S3 client when private files arrive).
- Review D-180 (sample photos) and D-181 (product-led home).
- Review Phase G, especially D-182 (search relevance thresholds) and D-183 (popular categories, noindex results).
- Decide D-175 (Start production host) before Phase O.
- Review Phase K, especially D-201 (total check), D-203 (one warehouse per item), D-208 (numbering), D-209–D-210 (GST and the in-house PDF), D-212 (late payment), D-214 (shipping line wording).
- Confirm GST data with an accountant: HSN codes and rates per category, GSTIN per warehouse.
- Review Phase J, especially D-192 (browser cart + merge), D-193 (5 per line, 20 lines), D-194 (one flash unit, rest regular), D-195–D-196 (coupon and payment-offer previews), D-200 (demo reviews).
- Decide **open** items when convenient: D-15, D-60, D-61, D-72 (COD cap is a ready parameter), D-75.
