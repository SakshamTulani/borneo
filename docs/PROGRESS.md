# Progress

| Date       | Phase | Branch                  | Done                                                                                                                                                                                                                                                                                                        | Next                                      |
| ---------- | ----- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-10-06 | A     | `phase-a/docs`          | First commit on `main` (.gitignore). Docs + 7 ADRs. Owner accepted ADR-0001…0007.                                                                                                                                                                                                                           | —                                         |
| 2026-10-06 | B     | `phase-b/skeleton`      | ADR-0008 (Start SSR) accepted, supersedes 0001. Monorepo, tooling, boundaries + canaries, rule checks, Docker, drizzle-kit, SSR shell, agent docs.                                                                                                                                                          | —                                         |
| 2026-10-06 | C     | `phase-c/design-system` | Mutation hook naming (D-174). 5 skills + 2 subagents. Validator proof (6/6 caught). Tokens, shadcn base, feedback + commerce components, noindex `/design-system`. 130 tests. `pnpm check` green.                                                                                                           | Owner review; then Phase D (shared rules) |
| 2026-10-06 | D     | `phase-d/shared-rules`  | Money helpers, IST time, Zod contracts, 14 pure rule modules. 110 tests named by D-xx, coverage 99.4% stmts / 97.8% branches (gate ≥ 90%). New `rule-ids` check. Architecture-reviewer pass: 11 findings fixed.                                                                                             | Owner review; then Phase E (DB + seed)    |
| 2026-10-06 | E     | `phase-e/db-seed`       | Drizzle schema (37 tables, CHECKs for never-break invariants), migrations 0000 pg_trgm + 0001 schema, validated seed (7 categories, 45 products), relation materialiser, `GET /categories` + `GET /products`, `pnpm db:reset`, seeded test DB. 58 API tests. Architecture-reviewer pass: 18 findings fixed. | Owner review; then Phase F (browse)       |

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
- Decide D-175 (Start production host) before Phase O.
- Decide **open** items when convenient: D-15, D-60, D-61, D-72 (COD cap is a ready parameter), D-75.
