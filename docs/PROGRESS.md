# Progress

| Date       | Phase | Branch                  | Done                                                                                                                                                                                                            | Next                                      |
| ---------- | ----- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-10-06 | A     | `phase-a/docs`          | First commit on `main` (.gitignore). Docs + 7 ADRs. Owner accepted ADR-0001…0007.                                                                                                                               | —                                         |
| 2026-10-06 | B     | `phase-b/skeleton`      | ADR-0008 (Start SSR) accepted, supersedes 0001. Monorepo, tooling, boundaries + canaries, rule checks, Docker, drizzle-kit, SSR shell, agent docs.                                                              | —                                         |
| 2026-10-06 | C     | `phase-c/design-system` | Mutation hook naming (D-174). 5 skills + 2 subagents. Validator proof (6/6 caught). Tokens, shadcn base, feedback + commerce components, noindex `/design-system`. 130 tests. `pnpm check` green.               | Owner review; then Phase D (shared rules) |
| 2026-10-06 | D     | `phase-d/shared-rules`  | Money helpers, IST time, Zod contracts, 14 pure rule modules. 110 tests named by D-xx, coverage 99.4% stmts / 97.8% branches (gate ≥ 90%). New `rule-ids` check. Architecture-reviewer pass: 11 findings fixed. | Owner review; then Phase E (DB + seed)    |

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
- Decide D-175 (Start production host) before Phase O.
- Decide **open** items when convenient: D-15, D-60, D-61, D-72 (COD cap is a ready parameter), D-75.
