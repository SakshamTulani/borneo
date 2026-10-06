# Progress

| Date       | Phase | Branch             | Done                                                                                                                                                                                                                   | Next                                      |
| ---------- | ----- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-10-06 | A     | `phase-a/docs`     | First commit on `main` (.gitignore). Docs + 7 ADRs. Owner accepted ADR-0001…0007.                                                                                                                                      | —                                         |
| 2026-10-06 | B     | `phase-b/skeleton` | ADR-0008 (TanStack Start SSR) accepted, supersedes 0001; docs updated. Monorepo, tooling, boundaries + 25 canaries, rule checks, Docker, drizzle-kit, SSR shell + health slice/module, agent docs. `pnpm check` green. | Owner review; then Phase C (shared rules) |

## Notes from Phase B

- TypeScript pinned to 6.0.x: TS 7 (native) has no JS API; typescript-eslint and dependency-cruiser need it (D-168).
- MinIO runs from `cgr.dev/chainguard/minio`: official MinIO images are no longer published (D-169).
- No customer-scoped module exists yet, so there is no cross-customer test yet. `check:rules` will fail any future customer-scoped repository without `*.cross-customer.test.ts`.
- shadcn/ui, React Hook Form, Leaflet, Better Auth, pg-boss, MinIO client not installed yet; added in the phase that first uses them.
- Hook names allow only `Query | Result | Form`. Mutations (add to cart, place order) need a name: proposal `use<Action>Mutation`. Owner to decide before Phase I.

## Waiting on owner

- Review Phase B; OK to commit history as-is.
- Decide hook name for mutations.
- Overrule any **assumption** in DECISIONS.md.
- Decide **open** items when convenient: D-15, D-60, D-61, D-72, D-75.
