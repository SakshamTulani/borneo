# Design

Working name **Borneo**. Feel: **clear, confident, warm.** One identity across value, upper-mid and premium.

## Principles

1. **Clear** — one primary action per screen; plain words; real numbers (price, date range, policy) up front.
2. **Confident** — no hype, no fake urgency; facts beat adjectives; we say "not for you" when true.
3. **Warm** — human copy, soft neutrals, generous space; help, never push.
4. **Tiers share one system.** Premium shows through photography, space and content depth — not different colours or fonts. Value products never look cheap.

## Logo

Concept: a lowercase **b** whose bowl is a seed/leaf shape — Borneo's rainforest as growth of an ecosystem. Wordmark lowercase `borneo`, rounded geometric sans. Draft in [`brand/borneo-logo.svg`](brand/borneo-logo.svg) (mark + wordmark) — to refine in the design-system phase.

## Tokens (proposed)

**Colour** (light theme v1; tokens named so dark can follow)

| Token | Hex | Use |
|---|---|---|
| `canvas` | #FAF8F5 | page background (warm off-white) |
| `surface` | #FFFFFF | cards, sheets |
| `ink` | #1D1B19 | primary text |
| `ink-muted` | #5E5953 | secondary text (≥ 4.5:1 on canvas) |
| `line` | #E7E2DB | borders, dividers |
| `brand` | #0F5B4E | primary actions, links (rainforest green) |
| `brand-ink` | #FFFFFF | text on brand |
| `brand-soft` | #E3F0EC | selected, highlights |
| `accent` | #B85C2E | offers, deals (warm clay; never alarm red) |
| `accent-soft` | #F7E8DF | offer chips |
| `success` | #1F7A44 | in stock, delivered |
| `warning` | #9A6200 | low stock (only when real), delay |
| `danger` | #B3261E | errors, not deliverable |
| `info` | #2B5C9E | neutral notices |
| `demo` | #6B4FA0 | "Demo mode" box only |

**Type** — Headings: Manrope (600/700). Body/UI: Inter (400/500). Prices and timers: tabular numerals. Scale (px): 12, 14, 16 (base), 18, 20, 24, 30, 36, 48. Line height 1.5 body, 1.2 headings.

**Space** 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. **Radius** 6 (inputs), 12 (cards), 999 (chips). **Elevation** 2 levels, soft warm shadow. **Motion** 150–250 ms ease-out; off under `prefers-reduced-motion`.

**Layout** Mobile-first. Breakpoints 640 / 1024 / 1280. Max content 1280. Mobile: bottom nav (Home, Categories, Search, Cart, Account) + sticky purchase bar on PDP.

## Core components & states

| Component | Must show | States |
|---|---|---|
| Price block | selling price (headline), genuine MRP + % off only if real, "effective price with [offer]" line (if applies to all), "from ₹X/mo" | default, flash, bundle, pre-order, unavailable |
| Delivery estimator | pincode / map pin, date range, COD yes/no | unknown, checking, deliverable, not deliverable here, out of stock at this pincode |
| Stock status | in stock / out of stock / pre-order | + Watch button when out of stock |
| Policy summary | return/replacement rule in one line + details | per category |
| Offer chip | offer name + condition | applied, not applicable (with reason) |
| Flash timer | real end time, cap progress | upcoming, live, sold out, ended |
| Payment hold timer | 5-min countdown | active, < 1 min, expired (item released) |
| Compatibility fact | "Works with …" from attribute | shown only when attribute exists |
| Suggestion card | product + **reason** ("fits your X") + add button | never pre-selected |
| Upgrade badge / strip | "Upgrade from your X" | hidden per D-132 |
| Compare table | category compare attributes, highlight differences | 2–4 desktop, swipe on mobile |
| Finder step | question, options, progress, back | phones, audio |
| Reviews | verified badge, rating | "No reviews yet" |
| Demo box | "Demo mode: this would be emailed" + content | dismissible, never in production |
| Sticky purchase bar | price, primary CTA | mobile PDP |

Global states for every data view: loading (skeleton), empty, error (with retry), offline.

## Copy

Short, direct, second person. Facts over adjectives. Prices "₹24,999" (Indian grouping). Dates as ranges "Thu 9 – Sat 11 Oct". No "Hurry!", no "Only N left" unless real cap and real count.

## Accessibility

WCAG 2.2 AA. Contrast ≥ 4.5:1 text, 3:1 UI. Visible focus ring (brand, 2px offset). Touch targets ≥ 44px. Full keyboard paths incl. compare, finder, map (address fields usable without the map). Timers: `aria-live="polite"` announcements at meaningful points (e.g. 1 min left), not every second. Prices read as full amounts. Errors tied to fields. vitest-axe on every component.
