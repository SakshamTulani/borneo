# Decisions

Status: **v1** = in the demo/MVP · **later** = planned after v1 · **open** = undecided · **assumption** = my default, overrule anytime · **blocker** = production launch blocker.
Rule: if two decisions conflict, the latest wins (see §Resolved conflicts).

## Market & business

| ID   | Rule                                                                                             | Status     |
| ---- | ------------------------------------------------------------------------------------------------ | ---------- |
| D-01 | India only. INR. English only. Prices GST-inclusive.                                             | v1         |
| D-02 | Direct only. No marketplace, no third-party sellers, no other channels.                          | v1         |
| D-03 | Single brand (Borneo). Tiers: value, upper-mid, premium.                                         | v1         |
| D-04 | KPIs: conversion rate, revenue per visitor. Guardrails: return rate, support contacts per order. | v1         |
| D-05 | Track repeat-purchase rate (not a target).                                                       | assumption |
| D-06 | No dark patterns: no fake scarcity, no fake discounts, nothing pre-ticked.                       | v1         |
| D-07 | Consumer side only. No admin UI; catalog/config via seed files.                                  | v1         |

## Catalog

| ID   | Rule                                                                                                                                                                                                                                                            | Status     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-10 | Launch categories: smartphones, audio, wearables, accessories, smart home, TVs, robot vacuums. Catalog configurable; no category hardcoded.                                                                                                                     | v1         |
| D-11 | Large home appliances (AC, washer, fridge) dropped.                                                                                                                                                                                                             | later      |
| D-12 | TVs sit under TVs only (not appliances).                                                                                                                                                                                                                        | v1         |
| D-13 | Full depth (guided finder, category compare, rich explainers): smartphones, audio. Others: standard template via per-category config.                                                                                                                           | v1         |
| D-14 | Structured specs per category + rich media.                                                                                                                                                                                                                     | v1         |
| D-15 | Catalog size unknown. Demo uses a seeded catalog.                                                                                                                                                                                                               | open       |
| D-16 | Product attributes must match their category's attribute definitions (type, listed options). Unknown keys are rejected; any may be missing.                                                                                                                     | assumption |
| D-17 | Discontinued products leave category listings but keep their PDP and relations (owners still need accessories and support).                                                                                                                                     | assumption |
| D-18 | Category filters come from category config and live in the URL. Options match any selected value; yes/no filters only narrow to "Yes"; numbers are minimums ("8 GB or more"); price is a maximum on the lowest regular price. Different filters must all match. | assumption |
| D-19 | Listings default to newest first (launch date), or price low→high / high→low by lowest regular price. A card shows the lowest price payable now among variants you can buy (flash price while live).                                                            | assumption |

## Relationships & compatibility

| ID   | Rule                                                                                                                                              | Status     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-20 | Relationship types: accessory, compatible, complementary, replacement, consumable, upgrade, previous/next generation, family tier, bundle member. | v1         |
| D-21 | Attribute rules generate default edges; manual overrides can add **and remove**.                                                                  | v1         |
| D-22 | A compatibility fact shows only when its structured attribute is filled. Never inferred from free text. Missing = no claim.                       | v1         |
| D-23 | Cross-brand ecosystem facts ("works with iPhone/Alexa") shown as plain facts, not comparisons.                                                    | v1         |
| D-24 | No self-declared owned devices. Owned devices = delivered items in the customer's order history.                                                  | v1         |
| D-25 | Recommendations: rules + curation only. Behavioural "bought together" later.                                                                      | v1 / later |
| D-27 | Relation overrides: a manual remove beats a manual add for the same edge; the pair is reported as a conflict.                                     | assumption |

## Pricing & offers

| ID   | Rule                                                                                                                                                                                                                                   | Status     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-30 | Headline is always the selling price. Never the effective price.                                                                                                                                                                       | v1         |
| D-31 | MRP must be genuine. Discount shown only if real.                                                                                                                                                                                      | v1         |
| D-32 | "Effective price with [offer]" line only when the offer applies to everyone paying that way.                                                                                                                                           | v1         |
| D-33 | EMI shown as "from ₹X/mo" wherever price shows (where EMI available).                                                                                                                                                                  | v1         |
| D-34 | Offer types: bank offers, coupons, no-cost EMI, bundle prices, flash prices.                                                                                                                                                           | v1         |
| D-35 | Max per order: 1 coupon + 1 payment offer. No-cost EMI uses the payment-offer slot (no bank discount with it).                                                                                                                         | v1         |
| D-36 | Flash price: payment offer allowed, no coupon.                                                                                                                                                                                         | v1         |
| D-37 | Bundle price: payment offer allowed, no coupon.                                                                                                                                                                                        | v1         |
| D-38 | Bundles fixed. Build-your-own later.                                                                                                                                                                                                   | v1 / later |
| D-39 | Flash price and bundle price don't combine.                                                                                                                                                                                            | assumption |
| D-40 | Coupon shapes: flat or %, optional min order value, optional category scope.                                                                                                                                                           | assumption |
| D-41 | Money stored and computed as integer paise.                                                                                                                                                                                            | v1         |
| D-42 | Savings % is floored (never overstated) and shown only when ≥ 1%; otherwise no MRP strike-through either.                                                                                                                              | assumption |
| D-43 | Coupon minimum order is measured on the coupon-eligible subtotal (regular-price lines in scope).                                                                                                                                       | assumption |
| D-44 | Payment offers apply after the coupon, to every in-scope line including flash and bundle lines.                                                                                                                                        | assumption |
| D-45 | No-cost EMI = upfront discount equal to the plan's interest; the bank charges interest on the reduced amount, so the customer repays the original price ÷ months. Never shown as an effective price.                                   | assumption |
| D-46 | Rounding: percentages round half up to the paisa; split discounts floor per line with the remainder on the last line (ADR-0006).                                                                                                       | assumption |
| D-47 | "from ₹X/mo" = lowest instalment among EMI plans available at that amount; a no-cost plan counts as 0% only while its offer is live, in scope and above its minimum. Instalments use a float power term, rounded half up to the paisa. | assumption |

## Delivery, stock, serviceability

| ID    | Rule                                                                                                                                               | Status     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-50  | Pan-India. Serviceability configurable per pincode × category.                                                                                     | v1         |
| D-51  | PDP shows "not deliverable here" clearly; never first fail at checkout.                                                                            | v1         |
| D-52  | Delivery shown as an estimated date range (not a promise), from pincode/map pin + warehouse stock.                                                 | v1         |
| D-53  | Each address stores an exact map pin.                                                                                                              | v1         |
| D-54  | Stock per warehouse; availability and date depend on pincode.                                                                                      | v1         |
| D-55  | Cart and checkout recheck stock, delivery date and COD eligibility on any address or pin change.                                                   | v1         |
| D-56  | Stock held only once payment starts: 5 min, visible real countdown. Applies to all products. Not held in cart.                                     | v1         |
| D-57  | Hold expiry: item returns to stock; we say so.                                                                                                     | v1         |
| D-58  | Payment gateway session timeout = 5 min.                                                                                                           | v1 (mock)  |
| D-59  | Payment succeeds after hold expiry: allocate if a unit is free; else auto-refund + clear message (in-account notice in demo).                      | v1         |
| D-60  | Scheduled delivery slots (formerly for large appliances). For TVs: undecided.                                                                      | open       |
| D-61  | Max quantity per line for normal items.                                                                                                            | open       |
| D-62  | No serviceability row for a pincode × category means not deliverable.                                                                              | assumption |
| D-63  | Delivery estimate: fastest warehouse with stock and a lane to the pincode (longest pincode-prefix lane wins); calendar days; IST dates.            | assumption |
| D-64  | Pre-order estimates count from the expected dispatch date.                                                                                         | assumption |
| D-65  | Pre-orders sell against a per-variant pre-order cap, not warehouse stock; their payment holds reserve against that cap and carry no warehouse.     | assumption |
| D-184 | A map pin resolves to the nearest known pincode centre within 15 km; farther away, the customer types the pincode. Centres live in `pincode_area`. | assumption |
| D-185 | The PDP remembers the last checked pincode in this browser only. A signed-in default address takes over in Phase I.                                | assumption |
| D-186 | PDP COD line = pincode × category COD, minus pre-orders (D-146) and live flash sales (D-71). The order-value cap (D-72) applies at checkout.       | assumption |
| D-187 | Map tiles come from the public OpenStreetMap tile server in the demo. Production needs a tile provider under its usage policy.                     | blocker    |

## Payments

| ID   | Rule                                                       | Status  |
| ---- | ---------------------------------------------------------- | ------- |
| D-70 | UPI, cards, EMI, COD (eligible pincodes).                  | v1      |
| D-71 | No COD for pre-orders or flash sales.                      | v1      |
| D-72 | COD order-value caps.                                      | open    |
| D-73 | No cross-sell inside the payment step.                     | v1      |
| D-74 | Real payment gateway.                                      | blocker |
| D-75 | COD refunds method (needs UPI/bank details from customer). | open    |

## Returns

| ID   | Rule                                                                                                                   | Status     |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-80 | Small electronics: 7-day return.                                                                                       | v1         |
| D-81 | Phones and TVs: replacement only, for defect or damage.                                                                | v1         |
| D-82 | Replacement window for phones/TVs = 7 days.                                                                            | assumption |
| D-83 | Wearables, accessories, smart home, robot vacuums, audio count as small electronics (seeded as category config, D-89). | assumption |
| D-84 | Policy in plain language on PDP and in cart.                                                                           | v1         |
| D-85 | No open-box delivery.                                                                                                  | v1         |
| D-86 | Self-serve return/replacement request with photo upload for defects.                                                   | v1         |
| D-87 | Return/replacement window ends at 23:59:59 IST on the 7th day after delivery.                                          | assumption |
| D-88 | Defect or damage requests require photos; change-of-mind returns don't.                                                | assumption |
| D-89 | Return policy (`return` / `replacementOnly`) is per-category config, never hardcoded by category key (D-10).           | v1         |

## Accounts & identity

| ID   | Rule                                                                                       | Status    |
| ---- | ------------------------------------------------------------------------------------------ | --------- |
| D-90 | No guest checkout (incl. flash sales).                                                     | v1        |
| D-91 | Login: email + password. Phone collected, saved to profile.                                | v1        |
| D-92 | Account created inside checkout; name/phone filled from address step. Easy password reset. | v1        |
| D-93 | Demo: email is an identifier only, **not verified**.                                       | v1 (demo) |
| D-94 | Verified email required for every purchase and flash sale.                                 | blocker   |
| D-95 | Demo password reset: code shown on screen in "Demo mode: this would be emailed" box.       | v1 (demo) |
| D-96 | Customer data scoped by customerId. No multi-tenancy.                                      | v1        |

## Notifications

| ID    | Rule                                                                                                                                           | Status     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-100 | Nothing leaves the system in demo. No email, SMS, WhatsApp, push.                                                                              | v1 (demo)  |
| D-101 | One NotificationAdapter interface (verification, reset, order, refund, etc.). Demo adapter writes to on-screen demo box + log + account inbox. | v1         |
| D-102 | Order confirmation, invoice, cancellation, refund confirmations live in the account and on the confirmation page. Invoice downloadable.        | v1         |
| D-103 | Courier sends delivery SMS, not us.                                                                                                            | v1         |
| D-104 | Real email provider behind the same adapter.                                                                                                   | blocker    |
| D-105 | Marketing and retention messages.                                                                                                              | later (v2) |

## Search

| ID    | Rule                                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ |
| D-110 | Exact model name or SKU → straight to PDP.                                                                   | v1     |
| D-111 | Configurable synonym list (earphones = earbuds, TWS, Hinglish).                                              | v1     |
| D-112 | Instant suggestions: products with price + stock status, plus matching categories.                           | v1     |
| D-113 | Basic price intent ("phone under 30000" → phones + price filter).                                            | v1     |
| D-114 | No results: same-category alternatives, popular categories, "browse all". No capture for unstocked products. | v1     |

## Discovery, compare, cross-sell

| ID    | Rule                                                                                                                                   | Status     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-120 | Home: hybrid. Categories in main nav; home entry points "Help me choose", "Deals", "Upgrade", "Build your setup".                      | v1         |
| D-121 | Same home for everyone + "Upgrade available" strip for logged-in customers (badge rules apply).                                        | v1         |
| D-122 | Compare within a category. Desktop up to 4; mobile up to 3, 2 visible, swipe for third.                                                | v1         |
| D-123 | Cross-sell allowed: PDP, add-to-cart confirmation, cart, order confirmation.                                                           | v1         |
| D-124 | Max 4 suggestions per surface; max 3 at add-to-cart. Each shows a reason. Nothing pre-ticked.                                          | v1         |
| D-125 | Cross-sell in post-delivery email.                                                                                                     | later      |
| D-126 | Suggestions exclude products in the cart or owned; ordered by relation type (accessory, consumable, compatible, …) then curation rank. | assumption |

## Upgrade

| ID    | Rule                                                                                                                                                          | Status     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-130 | Badge "Upgrade from your X": logged-in, owned item in order history.                                                                                          | v1         |
| D-131 | Only same product line, newer generation or higher tier. Never downgrade or different product type.                                                           | v1         |
| D-132 | Shown when a newer model exists. Hidden if they own the newer model. Hidden while owned item is inside its return window. No other ownership-age rule.        | v1         |
| D-133 | "What you gain" comparison vs owned device: PDP of phones and audio only.                                                                                     | v1         |
| D-134 | Proactive upgrade prompts (email/home).                                                                                                                       | later      |
| D-135 | No trade-in.                                                                                                                                                  | v1         |
| D-136 | Home upgrade strip: only when a newer generation exists; suggests the newest generation that is an upgrade, same tier if it exists, else nearest higher tier. | assumption |
| D-137 | Upgrades compare against the customer's newest, highest owned item in that line.                                                                              | assumption |
| D-138 | Tiers rank standard < pro < premium. An upgrade has generation and tier not lower, with at least one higher.                                                  | assumption |

## Flash sales & pre-orders

| ID    | Rule                                                                                                                            | Status                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| D-140 | Real urgency only: timer = actual sale end, never resets; real stock cap; price returns to normal after. No fake "only N left". | v1                         |
| D-141 | Anyone can view. Buying needs an account (verified email in production).                                                        | v1 / blocker               |
| D-142 | Limit 1 per customer, checked on email only.                                                                                    | v1                         |
| D-143 | Block disposable email domains; bot protection; rate-limit flash checkout.                                                      | v1 (bot protection mocked) |
| D-144 | Real bot protection provider.                                                                                                   | blocker                    |
| D-145 | Flash sales are the hardest engineering part; designed early.                                                                   | v1                         |
| D-146 | Pre-orders: pay in full, no COD, UPI/cards/EMI, free cancel before dispatch. Date shown as a range and updated if it changes.   | v1                         |
| D-147 | "Notify me" renamed **Watch**: on-site only, for out-of-stock catalog products.                                                 | v1                         |
| D-148 | "Only N left" only during a live flash sale, from the real remaining cap, when N ≤ 5.                                           | assumption                 |
| D-149 | Customers can cancel in their account until the order ships (pending payment, paid, confirmed, packed).                         | assumption                 |

## Reviews & content

| ID    | Rule                                                                                    | Status |
| ----- | --------------------------------------------------------------------------------------- | ------ |
| D-150 | Reviews: verified purchases only. Platform starts empty: "No reviews yet". Never faked. | v1     |
| D-151 | Review prompts inside the account only (after delivery).                                | v1     |
| D-152 | Brand-written explainers, spec comparisons, "who it's for / not for", FAQs.             | v1     |

## Platform & tech (details in ARCHITECTURE.md / ADRs)

| ID    | Rule                                                                                                                                                                                                       | Status     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| D-160 | Responsive web, mobile-first. Same features on both. Mobile: sticky purchase bar, bottom nav.                                                                                                              | v1         |
| D-161 | No native apps, no PWA, no push.                                                                                                                                                                           | v1         |
| D-162 | TanStack Start with SSR; SEO in v1 (ADR-0008). Fastify remains the only backend.                                                                                                                           | v1         |
| D-163 | Demo adapters: NotificationAdapter, PaymentGateway (mock), Analytics (console + log).                                                                                                                      | v1         |
| D-164 | Business rules are pure functions with unit tests, never in UI.                                                                                                                                            | v1         |
| D-165 | One `DEMO_MODE` flag gates every demo behaviour; production start refuses `DEMO_MODE=true`.                                                                                                                | assumption |
| D-166 | Courier tracking and bot protection are adapters (mocked in demo). Serviceability, lanes and pincode centres are Postgres config (D-50); a courier feed would load those tables.                           | assumption |
| D-167 | Light theme only in v1; tokens ready for dark.                                                                                                                                                             | assumption |
| D-168 | TypeScript pinned to 6.0.x until typescript-eslint supports 7.                                                                                                                                             | v1         |
| D-169 | Local MinIO from `cgr.dev/chainguard/minio` (dev only).                                                                                                                                                    | v1         |
| D-174 | Hook names: `use<Name>Query`, `use<Feature>Result`, `use<Feature>Form`, `use<Action>Mutation`. One per file.                                                                                               | v1         |
| D-175 | Production HTTP host for the Start server bundle (Nitro, srvx or a Node adapter). Build output is a fetch handler today.                                                                                   | open       |
| D-176 | `dark:` variants only apply under a `.dark` class, never from the OS colour scheme (v1 is light only).                                                                                                     | v1         |
| D-177 | shadcn components live in `apps/web/src/shared/ui/base` (`@/` alias), restyled to Borneo tokens. Commerce components are display-only.                                                                     | v1         |
| D-178 | Offer colour is `#9c4a1e` (was `#B85C2E`): the old value failed 4.5:1 on `offer-soft`. Token renamed `accent` → `offer`.                                                                                   | v1         |
| D-179 | Visual language follows the Apple store reference (parchment/white surfaces, pill actions, 18px hairline cards, 17px body, product-only shadow) with Borneo green as the single accent.                    | v1         |
| D-180 | Product photos are hosted sample photos (Unsplash, no visible third-party logos) stored as absolute https URLs in `media.url`; every listed product has one. Replaced by Borneo photography before launch. | v1         |
| D-181 | Home opens on products: the hero is the newest launch (photo, real price, CTA), then the next launches, then category banners. No slogan hero.                                                             | v1         |
| D-182 | Search relevance: a product matches at `word_similarity` ≥ 0.4 over name, line, category and model number; hits below 60% of the best hit are dropped. A typed SKU or model-number prefix ranks first.     | assumption |
| D-183 | Search: until there is sales data, "popular categories" in the no-results fallback are the first four in configured category order. Result pages are `noindex`.                                            | assumption |

## Services & tax

| ID    | Rule                                                                           | Status |
| ----- | ------------------------------------------------------------------------------ | ------ |
| D-170 | No services in v1 (installation, warranty, trade-in, repair, subscriptions).   | v1     |
| D-171 | No TV installation info. Watch support contacts per order on TVs after launch. | v1     |
| D-172 | GSTIN capture.                                                                 | later  |
| D-173 | B2C GST tax invoice per order, downloadable in account.                        | v1     |

## Production blockers

D-74 payment gateway · D-94 verified email · D-104 email provider · D-141 verified flash identity · D-144 bot protection · D-165 demo-mode guard · real courier/serviceability data and a full pincode directory (D-166, D-184) · map tile provider (D-187) · analytics provider (D-163).

## Resolved conflicts (latest wins)

| #   | Earlier                                                                            | Final                                                                                               |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Guest checkout allowed; guest orders linked by email                               | No guest checkout anywhere (D-90)                                                                   |
| 2   | Big appliances in launch list; large-appliance slots; no return after installation | Big appliances dropped (D-11); slot rule moot; TV slots open (D-60)                                 |
| 3   | TVs listed under TVs and home appliances                                           | TVs only (D-12)                                                                                     |
| 4   | Verified email for every purchase / flash sales                                    | Relaxed in demo (D-93); production blocker (D-94)                                                   |
| 5   | Flash limit checked on phone, address/pin, payment instrument                      | Email only + disposable-domain block, bot protection, rate limit (D-142, D-143)                     |
| 6   | Proposed 12-month ownership age for upgrade badge                                  | No age rule; hidden during return window only (D-132)                                               |
| 7   | Transactional email set proposed                                                   | No email in demo; NotificationAdapter (D-100, D-101)                                                |
| 8   | "Notify me"                                                                        | Renamed Watch, on-site only (D-147)                                                                 |
| 9   | Review request after delivery (email)                                              | In-account prompt only (D-151)                                                                      |
| 10  | Cross-sell in post-delivery email                                                  | Removed from v1 (D-125)                                                                             |
| 11  | Mobile compare "2 or 3"                                                            | 3 max, 2 visible (D-122)                                                                            |
| 12  | "Show everything in app"                                                           | No native app; means in the web account (D-161)                                                     |
| 13  | Installation info for appliances/TVs (proposed concession)                         | Appliances dropped; no TV installation info (D-171)                                                 |
| 14  | Stock hold for flash sales only                                                    | All products (D-56)                                                                                 |
| 15  | Vite SPA, SEO deferred as production blocker (ADR-0001)                            | TanStack Start with SSR, SEO in v1 (ADR-0008, D-162)                                                |
| 16  | TypeScript latest (7.x, native)                                                    | Pinned 6.0.x: TS 7 has no JS API; typescript-eslint and dependency-cruiser need it (D-168)          |
| 17  | MinIO image `minio/minio`                                                          | `cgr.dev/chainguard/minio`: official community images are no longer published (D-169)               |
| 18  | Phase C = shared rules (ROADMAP)                                                   | Phase C = agent tooling + validator proof + design system; later phases shift one letter            |
| 19  | Token `accent` #B85C2E (DESIGN)                                                    | `offer` #9c4a1e (D-178)                                                                             |
| 20  | Hook names Query/Result/Form only                                                  | + `use<Action>Mutation` (D-174)                                                                     |
| 21  | Return policy looked up from hardcoded category keys (first Phase D draft)         | Per-category config (D-89)                                                                          |
| 22  | No-cost EMI could appear as an "effective price" (first Phase D draft)             | Never; customer repays the full price (D-45)                                                        |
| 23  | Serviceability behind an adapter (D-166, Phase B)                                  | Serviceability is DB config; only courier tracking and bot protection are adapters (D-166, Phase H) |
