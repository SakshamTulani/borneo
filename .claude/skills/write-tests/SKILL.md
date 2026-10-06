---
name: write-tests
description: Write tests that follow this repo's testing rules (rule IDs, fakes via deps, app.inject, axe, cross-customer). Use after adding or changing code, or when asked to cover something.
---

# Write tests

Rules: [testing](../../../docs/agents/testing.md) · [definition-of-done](../../../docs/agents/definition-of-done.md)

Pick the row from the testing table for the file you changed, then:

- Shared rule ⇒ test names start with the `D-xx` ID from [DECISIONS](../../../docs/DECISIONS.md); cover each branch of the rule.
- Service ⇒ inject fakes through `create<M>Service(deps)`; no DB.
- Route ⇒ `buildApp(deps)` + `app.inject()`; assert status and error `code`.
- Repository ⇒ real Postgres, data from `apps/api/src/test/factories.ts` (extend it there).
- Customer-scoped ⇒ `<m>.cross-customer.test.ts` with `makeTwoCustomers()`.
- UI ⇒ RTL render by role/text + `expect(await axe(container)).toHaveNoViolations()`; one test per meaningful state.
- Timers ⇒ fake timers or a fixed `now` prop. Never sleep.

Run the package's `pnpm test`, then `pnpm check`. Delegate bulk work to the `test-writer` agent.
