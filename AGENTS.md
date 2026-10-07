# Borneo

Single-brand D2C electronics store for India: TanStack Start web (SSR) + Fastify API + Postgres, in a pnpm monorepo.

## Use pnpm only

Node ≥ 24, pnpm 11. Never npm or yarn.

## Commands

| Command                                | What                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| `docker compose up -d`                 | Postgres :5432, MinIO :9000 (console :9001)                                        |
| `pnpm dev`                             | web :5173 (SSR, `/api` proxied) + API :3000                                        |
| `pnpm check`                           | The only gate: format, lint, typecheck, depcruise, rules, tests                    |
| `pnpm test`                            | All Vitest suites                                                                  |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations (`apps/api/drizzle/`)                                           |
| `pnpm db:reset`                        | Drop, migrate, seed, materialise relations (dev DB; refused in production)         |
| `pnpm check:rules`                     | ADR, hook naming, customer scoping, boundary anchors, rule IDs ↔ tests ↔ DECISIONS |
| `pnpm audit:a11y`                      | axe over every main page's server HTML (needs `pnpm dev` running)                  |
| `pnpm perf:budget`                     | Builds web, checks gzipped client JS/CSS against the budget                        |

## Read before changing code

- Product: [PRD](docs/PRD.md), [DECISIONS](docs/DECISIONS.md) (rule IDs `D-xx`; latest wins)
- Tech: [ARCHITECTURE](docs/ARCHITECTURE.md), [DATA_MODEL](docs/DATA_MODEL.md), [ADRs](docs/adr/README.md), [DESIGN](docs/DESIGN.md)
- Plan: [ROADMAP](docs/ROADMAP.md), [PROGRESS](docs/PROGRESS.md), [LAUNCH checklist](docs/LAUNCH.md)
- How we work: [frontend](docs/agents/frontend-architecture.md), [backend](docs/agents/backend-architecture.md), [API design](docs/agents/api-design.md), [testing](docs/agents/testing.md), [git](docs/agents/git-workflow.md), [definition of done](docs/agents/definition-of-done.md)
