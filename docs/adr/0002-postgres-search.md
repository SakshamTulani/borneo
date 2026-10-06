# 0002. Search on Postgres (pg_trgm + synonyms)

- Status: accepted
- Date: 2026-10-06

## Context

Search needs exact model/SKU match, typo tolerance, synonyms, price intent, instant suggestions. Catalog is single-brand and small-to-medium.

## Options

1. Postgres pg_trgm + `search_synonym` table + simple price-intent parser.
2. Dedicated engine (Meilisearch, Typesense, OpenSearch).

## Decision

Option 1.

## Consequences

- \+ No extra service, no sync pipeline; stock/price always fresh.
- − Weaker relevance tuning and facets at scale. Move to a dedicated engine behind the `search` module if catalog or latency outgrow it.
