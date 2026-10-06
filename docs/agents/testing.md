# Testing

Vitest everywhere. `pnpm check` runs all suites; there is no CI.

| Where                   | What                | How                                                                                                                                                                                                                                    |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`       | Every business rule | Pure unit tests named `D-xx: …`. `check:rules` (rule-ids) fails if a rule file cites a D-xx that is not in DECISIONS.md or has no test named after it. Coverage ≥ 90% on `src/rules`, `money.ts`, `time.ts` (enforced by `pnpm test`). |
| `apps/api` services     | Orchestration       | Fake repositories/adapters injected via `create<M>Service(deps)`.                                                                                                                                                                      |
| `apps/api` routes       | HTTP contract       | `buildApp(deps)` + `app.inject()`. Status codes and error codes from api-design.md.                                                                                                                                                    |
| `apps/api` repositories | SQL                 | Against Docker Postgres (`docker compose up -d`). Data from `src/test/factories.ts`.                                                                                                                                                   |
| Customer-scoped modules | Isolation           | `<m>.cross-customer.test.ts`: create data for `owner`, read/update/delete as `other` (`makeTwoCustomers()`), expect nothing/404. Required by `check:rules`.                                                                            |
| `apps/web` components   | Behaviour + a11y    | RTL + `expect(await axe(container)).toHaveNoViolations()` for every UI component.                                                                                                                                                      |
| `apps/web` tokens       | Contrast + CSS sync | `tokens.test.ts`: every pair in `contrastPairs` meets its ratio; `index.css` matches `tokens.ts`.                                                                                                                                      |
| `tooling`               | Guards              | Unit tests per check; depcruise canary plants every rule's violation and expects the exact error. New depcruise rule ⇒ new canary (a test fails otherwise).                                                                            |

Rules:

- Test the rule, not the framework. No snapshot tests of markup.
- Timers (5-min hold, flash countdown) use fake timers; never sleep.
- Concurrency (stock reserve, flash cap) tested with parallel requests against real Postgres.
- Demo-only behaviour has a test proving it is off when `DEMO_MODE=false`.
