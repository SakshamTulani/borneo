# Testing

Vitest everywhere. `pnpm check` runs all suites; there is no CI.

| Where                   | What                | How                                                                                                                                                         |
| ----------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`       | Every business rule | Pure unit tests. Name tests after the rule ID (`D-35: one coupon + one payment offer`). Cover each DECISIONS rule a function implements.                    |
| `apps/api` services     | Orchestration       | Fake repositories/adapters injected via `create<M>Service(deps)`.                                                                                           |
| `apps/api` routes       | HTTP contract       | `buildApp(deps)` + `app.inject()`. Status codes and error codes from api-design.md.                                                                         |
| `apps/api` repositories | SQL                 | Against Docker Postgres (`docker compose up -d`). Data from `src/test/factories.ts`.                                                                        |
| Customer-scoped modules | Isolation           | `<m>.cross-customer.test.ts`: create data for `owner`, read/update/delete as `other` (`makeTwoCustomers()`), expect nothing/404. Required by `check:rules`. |
| `apps/web` components   | Behaviour + a11y    | RTL + `expect(await axe(container)).toHaveNoViolations()` for every UI component.                                                                           |
| `tooling`               | Guards              | Unit tests per check; depcruise canary plants every rule's violation and expects the exact error. New depcruise rule ⇒ new canary (a test fails otherwise). |

Rules:

- Test the rule, not the framework. No snapshot tests of markup.
- Timers (5-min hold, flash countdown) use fake timers; never sleep.
- Concurrency (stock reserve, flash cap) tested with parallel requests against real Postgres.
- Demo-only behaviour has a test proving it is off when `DEMO_MODE=false`.
