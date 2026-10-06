# 0006. Money as integer paise

- Status: accepted
- Date: 2026-10-06

## Context

Prices are INR, GST-inclusive. Offers, EMI and bundle allocations must add up exactly.

## Options

1. Integer paise (`bigint` in DB, `number` safe-integer in TS) + helpers in `packages/shared/money`.
2. Decimal library / `numeric` columns.
3. Floats.

## Decision

Option 1. Formatting with Indian grouping (₹1,24,999) only at the UI edge.

## Consequences

- \+ No rounding drift; exact sums; easy to test.
- − Must define rounding for % discounts and EMI (round half up, remainder on last line). Helpers own this.
