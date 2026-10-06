# 0005. Single tenant, customer-scoped data

- Status: accepted
- Date: 2026-10-06

## Context

Single brand, so no multi-tenancy. Customer data (orders, addresses, carts, reviews, watch, notifications) must never leak across customers.

## Options

1. `customer_id` on every customer row; repository methods require it; session supplies it.
2. Postgres row-level security.
3. Tenant/brand columns for future multi-brand.

## Decision

Option 1.

## Consequences

- \+ Simple, explicit, testable (scoping tests per repository).
- − Relies on discipline; enforced by repository signatures and tests, not the DB. RLS can be added later.
