# Roadmap

One branch per phase (`phase-x/name`). Each phase ends with something runnable. Every phase's validator includes `pnpm check` green. Phases after A start only when the ADRs they rely on are **accepted**.

| Phase | Scope | Runnable result | Validators | Status |
|---|---|---|---|---|
| A | Docs: PRD, ARCHITECTURE, DATA_MODEL, DECISIONS, DESIGN, ROADMAP, PROGRESS, seed ADRs | Docs readable on branch | Review by owner | in review |
| B | Monorepo skeleton: pnpm workspaces, TS, ESLint, Prettier, dependency-cruiser rules, lefthook, Vitest, Docker Compose (Postgres, MinIO), `DEMO_MODE` guard | `docker compose up`, `pnpm dev` → web shell + `GET /health` | `pnpm check`; depcruise fails on a planted bad import; API refuses `DEMO_MODE=true` in production | todo |
| C | Shared core: money (paise), Zod schemas, pure rules (pricing, stacking, hold, serviceability, COD, returns, upgrade badge, compatibility) | `pnpm test` | Unit tests per rule incl. every DECISIONS rule ID; coverage ≥ 90% on rules | todo |
| D | DB + seed: Drizzle schema, migrations, seed catalog (phones + audio deep, others template), relation materialiser | `pnpm db:reset` → seeded DB; `GET /categories`, `/products` | Migration up/down; seed validates against category schemas; relation rule/override tests | todo |
| E | Design system + browse: tokens, logo, base components, home (hybrid), nav, category page (config filters), PDP template | Browse home → category → PDP | vitest-axe on components; filters in URL; price block tests (D-30–33) | todo |
| F | Search: pg_trgm, synonyms, instant suggestions, exact-match jump, price intent, no-results | Search from header | Search tests for D-110–114; typo cases | todo |
| G | Serviceability & delivery: pincode + Leaflet pin, estimate, not-deliverable state | Change pincode on PDP, see date/COD change | Rule + UI tests D-50–55; keyboard path without map | todo |
| H | Auth & account shell: Better Auth, demo reset box, NotificationAdapter + inbox, addresses with pin | Sign up, log in, reset (demo box), manage addresses | customerId scoping tests; demo box hidden when not demo | todo |
| I | Cart & offers: cart, coupons, payment offers, EMI display, bundles, cross-sell surfaces with reasons | Add items, apply coupon/offer, see totals | Stacking tests D-35–37; max suggestions D-124; nothing pre-ticked | todo |
| J | Checkout & payment: in-checkout signup, recheck on address change, COD rules, mock gateway, 5-min hold (pg-boss), late success, confirmation, invoice PDF | Place order end to end (UPI/card/EMI/COD mock) | Hold expiry + late-success tests D-56–59; concurrency test on reserve | todo |
| K | Post-purchase: tracking (mock courier), cancel pre-dispatch, return/replacement with photos, owned devices, review prompts + reviews, Watch | Full account flow after an order | Return rule tests D-80–86; verified-review-only test | todo |
| L | Depth for phones + audio: guided finder, compare (all categories), explainers, upgrade badge + strip + "what you gain" | Finder → compare → upgrade from owned device | Badge rule tests D-130–132; compare limits D-122 | todo |
| M | Flash sales & pre-orders: real timers, caps, limit 1, disposable-domain block, rate limit, mock bot check, no COD; pre-order flow | Run a live flash sale against seeded stock | Concurrency/oversell test; timer never resets; D-140–146 | todo |
| N | Hardening: a11y audit, perf budget, analytics events, launch-blocker checklist | Demo-ready build | Axe clean; blockers listed with owners | todo |

Note: flash-sale stock logic (M) depends on the hold design in J; its data model is fixed in D so it is designed early (D-145).
