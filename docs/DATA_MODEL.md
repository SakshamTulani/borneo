# Data Model

Implemented in `apps/api/src/db/schema/` (Phase E). Conventions: `uuid` ids, `timestamptz`, money as `bigint` paise (`*_paise`), customer rows carry `customer_id` (ADR-0005). Snake case in DB. Enums are Postgres enums. Invariants that must never break are also `CHECK` constraints (price ≤ MRP, non-negative money, reserved ≤ on hand, sold ≤ cap, pre-order sold ≤ cap, photos for defect/damage returns, compat never on text, COD only where deliverable, no COD on pre-orders, flash and bundle never combined in a cart line).

`customer_id` is `text` (Better Auth's id type) with no FK yet: Better Auth tables arrive in Phase I and add it.

## Catalog

| Table            | Key columns                                                                                                                                                                                                                                                                                        | Notes                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `category`       | id, slug, name, parent_id, depth (`full`/`template`), config jsonb (`categoryConfigSchema`), return_policy (`return`/`replacementOnly`, D-89), sort                                                                                                                                                | config: filters, spec groups, compare attributes, finder id, home entry point    |
| `attribute_def`  | id, category_id, key, label, type (enum/number/bool/text/list), unit, options text[], option_labels jsonb (display labels for coded options), filterable, comparable, compat, sort                                                                                                                 | `compat` marks attributes that drive compatibility facts; never on `text` (D-22) |
| `product_line`   | id, category_id, name                                                                                                                                                                                                                                                                              | e.g. "Borneo Pulse" phones; upgrade badge scope                                  |
| `product`        | id, line_id, category_id, slug, name, model_number, generation, tier (`value`/`upper_mid`/`premium`), family_tier (`standard`/`pro`/`premium`), status (`draft`/`live`/`preorder`/`discontinued`), attributes jsonb, explainer, who_for, not_for, launched_at, dispatch_from/to (pre-orders, D-64) | attributes validated by `attributesSchemaFor(defs)` (D-16); GIN index            |
| `variant`        | id, product_id, sku, options jsonb (colour, storage), mrp_paise, price_paise, preorder_cap?, preorder_sold (D-65)                                                                                                                                                                                  | sellable unit                                                                    |
| `media`          | id, product_id, variant_id?, kind, s3_key, alt, sort                                                                                                                                                                                                                                               | MinIO                                                                            |
| `faq`            | id, product_id? / category_id?, question, answer, sort                                                                                                                                                                                                                                             | brand-written                                                                    |
| `search_synonym` | id, term, synonyms text[]                                                                                                                                                                                                                                                                          | config                                                                           |
| —                | trigram indexes on `product.name`, `product.model_number`, `variant.sku`                                                                                                                                                                                                                           | pg_trgm                                                                          |

## Relationships

| Table               | Key columns                                                                   | Notes                                                                             |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `relation_rule`     | id, type, from_category_id, to_category_id, match jsonb, reason_template      | `{kind: 'equal'                                                                   | 'contains', fromAttr, toAttr}` |
| `relation_override` | id, from_product_id, to_product_id, type, action (`add`/`remove`), reason     | manual curation                                                                   |
| `relation`          | from_product_id, to_product_id, type, source (`rule`/`manual`/`line`), reason | materialised: rules ∪ line edges ∪ adds − removes; rebuilt by `relations` service |

Types: `accessory, compatible, complementary, replacement, consumable, upgrade, prev_gen, next_gen, family_tier, bundle_member`.

## Bundles, offers, flash

| Table               | Key columns                                                                                             | Notes                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `bundle`            | id, slug, name, price_paise, active_from/to                                                             | fixed                                        |
| `bundle_item`       | bundle_id, variant_id, qty                                                                              |                                              |
| `offer`             | id, kind (`coupon`/`bank`/`no_cost_emi`), code?, name, rules jsonb, applies_to_all bool, active_from/to | `applies_to_all` drives effective-price line |
| `emi_plan`          | id, bank, tenure_months, annual_rate_bps, min_amount_paise                                              | "from ₹X/mo"                                 |
| `flash_sale`        | id, variant_id, sale_price_paise, starts_at, ends_at, cap, sold, per_customer_limit (1)                 | real cap + timer                             |
| `flash_purchase`    | flash_sale_id, customer_id, order_id                                                                    | unique (flash_sale_id, customer_id)          |
| `disposable_domain` | domain                                                                                                  | blocklist                                    |

## Inventory & delivery

| Table            | Key columns                                                                                                                | Notes                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `warehouse`      | id, code, name, pincode, lat, lng                                                                                          |                                 |
| `inventory`      | warehouse_id, variant_id, on_hand, reserved                                                                                | check-and-reserve in one UPDATE |
| `stock_hold`     | id, order_id, warehouse_id? (null = pre-order, D-65), variant_id, qty, expires_at, status (`active`/`converted`/`expired`) | 5 min                           |
| `serviceability` | pincode, category_id, deliverable, cod_allowed                                                                             | per pincode × category          |
| `delivery_lane`  | warehouse_id, pincode_prefix (`""` = all), min_days, max_days                                                              | date range source               |

## Customers

| Table              | Key columns                                                                                      | Notes                    |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------ |
| Better Auth tables | user, session, account, verification                                                             | email = identifier       |
| `customer_profile` | customer_id, name, phone                                                                         |                          |
| `address`          | id, customer_id, name, phone, line1, line2, landmark, city, state, pincode, lat, lng, is_default | exact map pin            |
| `watch`            | customer_id, variant_id, created_at                                                              | on-site only             |
| `notification`     | id, customer_id, kind, title, body, payload jsonb, created_at, read_at                           | demo inbox + adapter log |

## Cart & orders

| Table                | Key columns                                                                                                                                                                                                                 | Notes                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `cart` / `cart_item` | cart: customer_id; item: variant_id? / bundle_id?, qty, flash_sale_id?                                                                                                                                                      | no stock held                                                                               |
| `order`              | id, customer_id, number, status, address snapshot jsonb, subtotal/discount/total_paise, coupon_offer_id?, payment_offer_id?, payment_method, is_preorder, eta_from/eta_to, idempotency_key (unique per customer), placed_at | status: `pending_payment, paid, confirmed, packed, shipped, delivered, cancelled, refunded` |
| `order_item`         | id, order_id, variant_id, sku, product_name, return_policy (snapshots), qty, mrp_paise, unit_price_paise, discount_paise, warehouse_id, bundle_id?, flash_sale_id?, return_window_ends_at                                   | window drives badge hiding                                                                  |
| `payment`            | id, order_id, gateway_ref, method, amount_paise, status, idempotency_key, started_at, expires_at, succeeded_at                                                                                                              | late-success detection                                                                      |
| `refund`             | id, order_id, payment_id, amount_paise, reason, status                                                                                                                                                                      |                                                                                             |
| `shipment`           | id, order_id, courier, tracking_no, status, events jsonb, delivered_at                                                                                                                                                      | mock courier                                                                                |
| `return_request`     | id, order_item_id, customer_id, kind (`return`/`replacement`), reason, details, photo_keys text[], status                                                                                                                   | photos in MinIO                                                                             |
| `invoice`            | id, order_id, number, s3_key, issued_at                                                                                                                                                                                     | B2C GST invoice                                                                             |
| `review`             | id, product_id, customer_id, order_item_id (unique), rating, title, body, created_at                                                                                                                                        | verified purchase only                                                                      |

## Seed (`pnpm db:reset`)

`apps/api/src/db/seed/`: plain data files plus `buildSeed(now)`, which validates everything first (`seedIssues`: attributes vs category schema, config keys, prices ≤ MRP, bundles cheaper than members, flash cap ≤ stock, offers parsed with shared contracts, no override conflicts). Ids are stable name-based uuids (`seedId(kind, key)`). Offers, flash sales and pre-order dates are relative to seeding time. Seeded: 7 categories, 16 lines, 45 products, 56 variants, 3 warehouses, 24 demo pincodes, 2 bundles, 5 offers, 10 EMI plans, 2 flash sales (one live, one upcoming), no reviews (D-150), no media yet.

## Views

- `owned_device` = delivered `order_item` ⋈ `variant` ⋈ `product` per customer.
- `upgrade_candidate` = computed by rule (D-130–132), not stored.

## Open

TV delivery slots (D-60), max qty per line (D-61), COD caps (D-72), COD refund details (D-75).
