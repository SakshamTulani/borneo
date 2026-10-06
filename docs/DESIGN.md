# Design

Working name **Borneo**. Feel: **clear, confident, warm.** One identity across value, upper-mid and premium.

## Principles

1. **Clear** — one primary action per screen; plain words; real numbers (price, date range, policy) up front.
2. **Confident** — no hype, no fake urgency; facts beat adjectives; we say "not for you" when true.
3. **Warm** — human copy, soft neutrals, generous space; help, never push.
4. **Tiers share one system.** Premium shows through photography, space and content depth — not different colours or fonts. Value products never look cheap.

## Logo

A lowercase **b** whose bowl is a leaf: the rainforest as a growing ecosystem. Lowercase `borneo` wordmark. Draft: [`brand/borneo-logo.svg`](brand/borneo-logo.svg), in code as `shared/ui/brand/Logo.tsx`. Refine before launch.

## Living reference

`/design-system` (noindex) renders every token, base component and commerce component in all states, using static demo props labelled as demo. Code under `apps/web/src/shared/ui/`; the page is `features/design-system`.

## Tokens

Source of truth: `apps/web/src/shared/ui/tokens.ts`. `src/index.css` must match it, and every text/background pair must meet its WCAG ratio. `tokens.test.ts` enforces both.

**Colour** (light only in v1, D-167; `dark:` only applies under a `.dark` class, never from the OS setting)

| Token                      | Hex               | Use                               |
| -------------------------- | ----------------- | --------------------------------- |
| `canvas`                   | #faf8f5           | Page background                   |
| `surface`                  | #ffffff           | Cards, sheets                     |
| `muted`                    | #f2eee8           | Skeletons, hover, quiet fills     |
| `ink`                      | #1d1b19           | Primary text                      |
| `ink-muted`                | #5e5953           | Secondary text                    |
| `line`                     | #e7e2db           | Dividers, card borders            |
| `line-strong`              | #8c857c           | Input and control borders (≥ 3:1) |
| `brand`                    | #0f5b4e           | Primary actions, links, focus     |
| `brand-ink` / `brand-soft` | #ffffff / #e3f0ec | Text on brand / selected          |
| `offer` / `offer-soft`     | #9c4a1e / #f7e8df | Offers, savings (never alarm red) |
| `success` / `success-soft` | #1f7a44 / #e4f2ea | In stock, delivered               |
| `warning` / `warning-soft` | #9a6200 / #fbf0d9 | Real low stock, delays            |
| `danger` / `danger-soft`   | #b3261e / #fbe7e5 | Errors, not deliverable           |
| `info` / `info-soft`       | #2b5c9e / #e6eef8 | Neutral notices                   |
| `demo` / `demo-soft`       | #6b4fa0 / #efeaf7 | Demo-mode labels only             |

shadcn semantic names (`primary`, `secondary`, `muted-foreground`, `destructive`, `border`, `input`, `ring`, …) map onto these in `index.css`, so library components inherit Borneo tokens. The earlier `accent` token is now `offer`, because shadcn reserves `accent` for hover fills.

**Type**: Manrope (headings), Inter (body), both self-hosted variable fonts. Tabular numerals for prices and timers. Scale (px): 12, 14, 16, 18, 20, 24, 30, 36, 48.

**Space**: 4px grid (4–64). **Radius**: 6 (inputs, buttons), 12 (cards), full (chips, badges). **Motion**: short, and off under `prefers-reduced-motion`.

**Layout**: mobile-first. Breakpoints 640 / 1024 / 1280. Mobile gets a bottom nav and a sticky purchase bar on product pages (built in later phases).

## Components

Every component has a render test and a vitest-axe check per state.

| Layer                   | Path                    | Components                                                                                                                                |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Base (shadcn, restyled) | `shared/ui/base/`       | Button (variants, disabled, loading, ≥ 44px), Badge (9 tones), Card, Input, Label, RadioGroup, Separator, Skeleton, Table                 |
| Feedback                | `shared/ui/feedback/`   | EmptyState, ErrorState (retry, `role=alert`), DemoBox                                                                                     |
| Brand                   | `shared/ui/brand/`      | Logo                                                                                                                                      |
| Navigation              | `shared/ui/navigation/` | BottomNav (mobile, `aria-current`), Breadcrumbs; `AppShell` has a skip link and sticky header                                             |
| Commerce                | `shared/ui/commerce/`   | PriceBlock, Rating, StatusBadge, ProductCard + skeleton, VariantSelector, DeliveryChecker, OfferCard, Countdown, SpecTable, OrderTimeline |

Commerce components only display. They never compute prices, savings, eligibility, serviceability or stock. Those values arrive as props from `@borneo/shared` rules.

| Component       | Must show                                                                                              | States                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| PriceBlock      | Selling price as the headline; genuine MRP and savings when passed; effective-price line; "from ₹X/mo" | plain, MRP + savings + EMI, effective price, unavailable                                                            |
| Rating          | Score + verified count                                                                                 | with reviews, "No reviews yet"                                                                                      |
| StatusBadge     | Text label + icon                                                                                      | in stock, low stock (real count), out of stock, pre-order, flash sale, new, upgrade available, bundle, works with X |
| ProductCard     | Image, badges, family, name (stretched link), rating, price                                            | in stock, flash, pre-order, out of stock + Watch/Watching, skeleton                                                 |
| VariantSelector | Legend + current choice; unavailable options stay visible                                              | selected, unavailable                                                                                               |
| DeliveryChecker | Pincode field, date range, COD                                                                         | idle, checking, deliverable ± COD, not deliverable, out of stock here, invalid                                      |
| OfferCard       | Kind, title, terms, code                                                                               | available, applied, not applicable (with reason)                                                                    |
| Countdown       | Real fixed deadline plus its absolute time                                                             | pending (SSR), upcoming, live, urgent (announced once), ended                                                       |
| SpecTable       | Grouped rows                                                                                           | full, "Not specified", empty                                                                                        |
| OrderTimeline   | Ordered steps, `aria-current="step"`                                                                   | in transit, cancelled, replacement requested                                                                        |

Still to design, in later phases: payment hold timer, upgrade strip, compare table, finder step, sticky purchase bar (with add to cart, Phase J), product media gallery. Phase F placed the policy summary and suggestion-with-reason inline on the PDP.

Global states for every data view: loading (skeleton), empty, error (with retry).

## Copy

Short, direct, second person. Facts over adjectives. Prices "₹24,999" (Indian grouping). Dates as ranges "Fri, 9 – Sun, 11 Oct" (India time). No "Hurry!", no "Only N left" unless real cap and real count.

## Accessibility

WCAG 2.2 AA. Contrast ≥ 4.5:1 text, 3:1 UI. Visible focus ring (brand, 2px offset). Touch targets ≥ 44px. Full keyboard paths incl. compare, finder, map (address fields usable without the map). Timers: `aria-live="polite"` announcements at meaningful points (e.g. 1 min left), not every second. Prices read as full amounts. Errors tied to fields. vitest-axe on every component. Contrast pairs are unit-tested (`tokens.test.ts`). axe in jsdom cannot measure contrast, so the token test covers it.
