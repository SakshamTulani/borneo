# Data Model (proposed)

Conventions: `uuid` ids, `timestamptz`, money as `bigint` paise (`*_paise`), customer rows carry `customer_id` (ADR-0005). Snake case in DB.

## Catalog

| Table            | Key columns                                                                                                                                                                                                                                                   | Notes                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `category`       | id, slug, name, parent_id, depth (`full`/`template`), config jsonb, return_policy_id, sort                                                                                                                                                                    | config: filters, spec groups, compare attributes, finder id  |
| `attribute_def`  | id, category_id, key, label, type (enum/number/bool/text), unit, filterable, comparable, compat_key                                                                                                                                                           | `compat_key` marks attributes that drive compatibility facts |
| `product_line`   | id, category_id, name                                                                                                                                                                                                                                         | e.g. "Borneo Pulse" phones; upgrade badge scope              |
| `product`        | id, line_id, category_id, slug, name, model_number, generation, tier (`value`/`upper_mid`/`premium`), family_tier (`standard`/`pro`/`premium`), status (`draft`/`live`/`preorder`/`discontinued`), attributes jsonb, explainer, who_for, not_for, launched_at | attributes validated by category Zod schema; GIN index       |
| `variant`        | id, product_id, sku, options jsonb (colour, storage), mrp_paise, price_paise                                                                                                                                                                                  | sellable unit                                                |
| `media`          | id, product_id, variant_id?, kind, s3_key, alt, sort                                                                                                                                                                                                          | MinIO                                                        |
| `faq`            | id, product_id? / category_id?, question, answer, sort                                                                                                                                                                                                        | brand-written                                                |
| `search_synonym` | id, term, synonyms text[]                                                                                                                                                                                                                                     | config                                                       |
| —                | trigram indexes on `product.name`, `product.model_number`, `variant.sku`                                                                                                                                                                                      | pg_trgm                                                      |

## Relationships

| Table               | Key columns                                                               | Notes                                  |
| ------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `relation_rule`     | id, type, from_category_id, to_category_id, match jsonb, reason_template  | e.g. `{eq: ["connector","connector"]}` |
| `relation_override` | id, from_product_id, to_product_id, type, action (`add`/`remove`), reason | manual curation                        |
| `relation`          | from_product_id, to_product_id, type, source (`rule`/`manual`), reason    | materialised: rules ∪ adds − removes   |

Types: `accessory, compatible, complementary, replacement, consumable, upgrade, prev_gen, next_gen, family_tier, bundle_member`.

## Bundles, offers, flash

| Table               | Key columns                                                                                       | Notes                                        |
| ------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `bundle`            | id, name, price_paise, active_from/to                                                             | fixed                                        |
| `bundle_item`       | bundle_id, variant_id, qty                                                                        |                                              |
| `offer`             | id, kind (`coupon`/`bank`/`no_cost_emi`), code?, rules jsonb, applies_to_all bool, active_from/to | `applies_to_all` drives effective-price line |
| `emi_plan`          | id, bank, tenure_months, interest_bps, no_cost bool                                               | "from ₹X/mo"                                 |
| `flash_sale`        | id, variant_id, sale_price_paise, starts_at, ends_at, cap, sold, per_customer_limit (1)           | real cap + timer                             |
| `flash_purchase`    | flash_sale_id, customer_id, order_id                                                              | unique (flash_sale_id, customer_id)          |
| `disposable_domain` | domain                                                                                            | blocklist                                    |

## Inventory & delivery

| Table            | Key columns                                                                                      | Notes                           |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- |
| `warehouse`      | id, name, pincode, lat, lng                                                                      |                                 |
| `inventory`      | warehouse_id, variant_id, on_hand, reserved                                                      | check-and-reserve in one UPDATE |
| `stock_hold`     | id, order_id, warehouse_id, variant_id, qty, expires_at, status (`active`/`converted`/`expired`) | 5 min                           |
| `serviceability` | pincode, category_id, deliverable, cod_allowed                                                   | per pincode × category          |
| `delivery_lane`  | warehouse_id, zone (pincode prefix), min_days, max_days                                          | date range source               |

## Customers

| Table              | Key columns                                                                                      | Notes                    |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------ |
| Better Auth tables | user, session, account, verification                                                             | email = identifier       |
| `customer_profile` | customer_id, name, phone                                                                         |                          |
| `address`          | id, customer_id, name, phone, line1, line2, landmark, city, state, pincode, lat, lng, is_default | exact map pin            |
| `watch`            | customer_id, variant_id, created_at                                                              | on-site only             |
| `notification`     | id, customer_id, kind, title, body, payload jsonb, created_at, read_at                           | demo inbox + adapter log |

## Cart & orders

| Table                | Key columns                                                                                                                                                                          | Notes                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `cart` / `cart_item` | cart: customer_id; item: variant_id? / bundle_id?, qty, flash_sale_id?                                                                                                               | no stock held                                                                               |
| `order`              | id, customer_id, number, status, address snapshot jsonb, subtotal/discount/total_paise, coupon_offer_id?, payment_offer_id?, payment_method, is_preorder, eta_min/eta_max, placed_at | status: `pending_payment, paid, confirmed, packed, shipped, delivered, cancelled, refunded` |
| `order_item`         | id, order_id, variant_id, qty, mrp_paise, unit_price_paise, discount_paise, warehouse_id, bundle_id?, flash_sale_id?, return_window_ends_at                                          | window drives badge hiding                                                                  |
| `payment`            | id, order_id, gateway_ref, method, amount_paise, status, started_at, expires_at, succeeded_at                                                                                        | late-success detection                                                                      |
| `refund`             | id, order_id, payment_id, amount_paise, reason, status                                                                                                                               |                                                                                             |
| `shipment`           | id, order_id, courier, tracking_no, status, events jsonb, delivered_at                                                                                                               | mock courier                                                                                |
| `return_request`     | id, order_item_id, customer_id, kind (`return`/`replacement`), reason, photo_keys text[], status                                                                                     | photos in MinIO                                                                             |
| `invoice`            | id, order_id, number, s3_key, issued_at                                                                                                                                              | B2C GST invoice                                                                             |
| `review`             | id, product_id, customer_id, order_item_id (unique), rating, title, body, created_at                                                                                                 | verified purchase only                                                                      |

## Views

- `owned_device` = delivered `order_item` ⋈ `variant` ⋈ `product` per customer.
- `upgrade_candidate` = computed by rule (D-130–132), not stored.

## Open

TV delivery slots (D-60), max qty per line (D-61), COD caps (D-72), COD refund details (D-75).
