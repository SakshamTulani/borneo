---
name: db-migration
description: Change the Postgres schema with Drizzle and produce a migration. Use for any new table, column, index or extension.
---

# DB migration

Rules: [DATA_MODEL](../../../docs/DATA_MODEL.md) · [backend-architecture](../../../docs/agents/backend-architecture.md) · [ADR-0006](../../../docs/adr/0006-money-integer-paise.md) · [ADR-0005](../../../docs/adr/0005-customer-scoping-single-tenant.md)

1. `docker compose up -d`.
2. Edit tables in `apps/api/src/db/schema/` (export from `index.ts`). Conventions: uuid ids, `timestamptz`, money `bigint` `*_paise`, `customer_id` on customer rows.
3. `pnpm db:generate` → review the SQL in `apps/api/drizzle/`. Rename the file meaningfully if drizzle-kit allows.
4. Extensions/raw SQL (e.g. `pg_trgm`): `pnpm --filter @borneo/api exec drizzle-kit generate --custom --name <name>`, then write the SQL.
5. `pnpm db:migrate`. Never edit an applied migration; add a new one.
6. Update [DATA_MODEL](../../../docs/DATA_MODEL.md) if the model changed. Commit SQL + `meta/`.
7. `pnpm check`.
