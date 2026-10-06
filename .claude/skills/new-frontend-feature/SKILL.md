---
name: new-frontend-feature
description: Scaffold a new feature slice in apps/web (api, mappers, repository, hooks, ui, model.ts, index.ts) and wire it into a route. Use when adding any user-facing capability to the web app.
---

# New frontend feature

Rules: [frontend-architecture](../../../docs/agents/frontend-architecture.md) · [ADR-0007](../../../docs/adr/0007-layered-slices-enforced-boundaries.md) · [ADR-0008](../../../docs/adr/0008-tanstack-start-ssr.md) · [DESIGN](../../../docs/DESIGN.md)

Copy the shape of `apps/web/src/features/health` (reference slice).

1. Find the `D-xx` rules the feature implements in [DECISIONS](../../../docs/DECISIONS.md). Business logic goes in `@borneo/shared`, not here.
2. Create `apps/web/src/features/<name>/` with only the layers you need: `model.ts`, `api/`, `mappers/`, `repository/` (exports `queryOptions`), `hooks/`, `ui/`, `index.ts`.
3. Hooks: one per file, `use<Name>Query | use<Feature>Result | use<Feature>Form | use<Action>Mutation`.
4. UI: compose `shared/ui` components; tokens only; all states (loading, empty, error).
5. Route in `src/routes/`: `head: () => pageHead(...)`, `loader` prefetches the query, component composes from `features/<name>` index only.
6. Tests: `/write-tests`. Every `ui/` component gets a render test + axe.
7. `pnpm check`.
