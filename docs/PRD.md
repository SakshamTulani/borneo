# Borneo — Product Requirements (v1 / demo)

Rules are numbered in [DECISIONS.md](DECISIONS.md) (`D-xx`). This doc says _what and why_; DECISIONS says _the exact rule_.

## 1. Product

Direct-to-consumer, single-brand store for Borneo consumer electronics and smart home. India only. Consumer side only (no admin UI; data via seed/config).

**Goal:** turn product interest into confident purchases and a long-term relationship with the Borneo ecosystem. Right purchase over pushed purchase.

**KPIs:** conversion rate, revenue per visitor.
**Guardrails (can veto a design):** return rate, support contacts per order.
**Tracked, not targeted:** repeat-purchase rate.

## 2. Scope

| In v1                                                                                  | Out of v1                                                                                             |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Responsive web, mobile-first, server-rendered (SEO)                                    | Native apps, PWA, push                                                                                |
| Categories: smartphones, audio, wearables, accessories, smart home, TVs, robot vacuums | Large home appliances (AC, washer, fridge), tablets, laptops, projectors (catalog stays configurable) |
| Full depth: smartphones, audio                                                         | Services (installation, warranty, trade-in, repair, subscriptions)                                    |
| Template depth: all other categories                                                   | Marketing/retention messages, any outbound email/SMS/WhatsApp                                         |
| Rules + curation recommendations                                                       | Behavioural recs ("bought together")                                                                  |
| Fixed bundles                                                                          | Build-your-own bundles                                                                                |
|                                                                                        | GSTIN capture, guest checkout, self-declared devices                                                  |

## 3. Shopping mindsets → page modules

Mindsets are **modules on shared pages**, not separate funnels.

| #   | Mindset               | Primary entry                 | Key modules                                                                           |
| --- | --------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Knows the product     | Search                        | Exact-match jump to PDP, instant suggestions, sticky buy bar, fast checkout           |
| 2   | Knows the category    | Category nav                  | Config-driven filters, compare (4 desktop / 3 mobile), spec comparison, reviews, FAQs |
| 3   | Unsure what's right   | Home "Help me choose"         | Guided finder (phones, audio), explainers, "who it's for / not for"                   |
| 4   | Wants the best deal   | Home "Deals"                  | Real offers, bundles, payment offers, EMI, flash sales                                |
| 5   | Upgrading             | Home "Upgrade", upgrade strip | Upgrade badge, "what you gain" comparison (phones, audio PDP)                         |
| 6   | Building an ecosystem | Home "Build your setup"       | Compatibility filters, ecosystem pages, accessories, bundles                          |

Mindsets 5 & 6 for new customers rely on compatibility filters and ecosystem pages (no self-declared devices).

## 4. Journey requirements

**Discovery** — Home: hybrid. Categories in main nav; mindset entry points on home. Same home for everyone + "Upgrade available" strip for logged-in customers.

**Search** — exact model/SKU → PDP; configurable synonyms (incl. Hinglish); instant suggestions with price + stock + categories; price intent ("phone under 30000"); no-results fallback.

**Exploration / evaluation** — Category pages from per-category config (filters, specs, compare attributes). PDP: selling price headline, genuine MRP, offers, EMI, delivery estimate by pincode/map pin, plain-language return policy, specs, explainer, who it's for / not for, FAQs, verified reviews ("No reviews yet" when empty), compatibility facts, related products with reasons.

**Comparison** — Same category. Desktop up to 4, mobile up to 3 (2 visible, swipe).

**Purchase** — Login required (email + password). Account created inside checkout. Address with map pin. Stock, delivery date and COD rechecked on any address/pin change. Offer stacking per D-30s.

**Payment** — UPI, cards, EMI, COD (eligible pincodes). Stock held 5 min from payment start with visible countdown. Mock gateway in demo.

**Delivery** — Estimated date range per pincode + warehouse stock. Courier sends SMS (not us). Tracking in account.

**Post-purchase** — Account: track, cancel before dispatch, return/replacement with photos, invoice download, review prompts, Watch list, owned devices (from order history), notification inbox.

**Retention / repeat** — v1: upgrade badge + strip, compatible accessories on owned devices, review prompts. Proactive prompts later.

## 5. Category model

Shared commerce foundation + per-category config: attributes, filters, spec groups, compare attributes, finder (phones/audio), return policy, serviceability. Products link via a relationship graph (accessory, compatible, complementary, replacement, consumable, upgrade, prev/next generation, family tier, bundle). Rules generate edges from structured attributes; manual overrides add or remove.

## 6. Demo mode

The build is a demo/MVP. Demo-only behaviours (on-screen notification box, unverified email, mock payment, relaxed flash-sale identity) sit behind one `DEMO_MODE` flag. Each one is a production blocker (DECISIONS §Production blockers).

## 7. Assumptions & open questions

See DECISIONS.md, entries marked **assumption** or **open**.
