# Progress

| Date       | Phase | Branch                  | Done                                                                                                                                                                                              | Next                                      |
| ---------- | ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2026-10-06 | A     | `phase-a/docs`          | First commit on `main` (.gitignore). Docs + 7 ADRs. Owner accepted ADR-0001…0007.                                                                                                                 | —                                         |
| 2026-10-06 | B     | `phase-b/skeleton`      | ADR-0008 (Start SSR) accepted, supersedes 0001. Monorepo, tooling, boundaries + canaries, rule checks, Docker, drizzle-kit, SSR shell, agent docs.                                                | —                                         |
| 2026-10-06 | C     | `phase-c/design-system` | Mutation hook naming (D-174). 5 skills + 2 subagents. Validator proof (6/6 caught). Tokens, shadcn base, feedback + commerce components, noindex `/design-system`. 130 tests. `pnpm check` green. | Owner review; then Phase D (shared rules) |

## Phase C: validator proof

Each fault was planted on a green baseline, run through `pnpm check`, then reverted. Afterwards `pnpm check` exit 0.

| Fault                                          | Caught by           | Message                                                                                         |
| ---------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| Lint: unused variable in `apps/api/src/app.ts` | `eslint`            | `'unusedFlag' is assigned a value but never used`                                               |
| Type: string into boolean in `toApiStatus.ts`  | `tsc` (web)         | `TS2322: Type 'string' is not assignable to type 'boolean'`                                     |
| Import: repository re-exports from ui          | `depcruise`         | `web-upward-from-repository: …/repository/healthRepository.ts → …/ui/ApiStatusBadge.tsx`        |
| Hook naming: `hooks/useHealth.ts`              | `check:rules` hooks | `file name must be use<Name>Query, use<Feature>Result, use<Feature>Form or use<Action>Mutation` |
| Malformed ADR: 0004 without `## Options`       | `check:rules` adr   | `0004-pg-boss-jobs.md: missing section "## Options"`                                            |
| Failing test: health service ignores DB state  | `vitest` (api)      | `expected "database": "down", received "up"`                                                    |

## Phase C: gaps found and fixed

- **Boundary blind spot (since Phase B).** dependency-cruiser didn't read package `exports`, so `@borneo/shared` and `@/` alias imports were invisible to every rule. Fixed with `exportsFields` plus `tsconfig.depcruise.json`. New `no-unresolvable` rule so this can't silently recur. Canaries now run the real CLI (incl. an `@/` alias case).
- **shadcn CLI** imported `cn` from an unrelated npm package named `cn` and installed it. Removed; local `@/shared/lib/utils`.
- **OS dark mode leaked** half-dark shadcn styles onto the light theme. `dark:` now requires a `.dark` class (D-176).
- **Offer colour failed contrast** on its soft fill (3.8:1). Darkened to `#9c4a1e` (D-178); the contrast test guards it.
- **No root error/not-found component**: a render error blanked the page. Added both to `__root.tsx`.
- `start` script pointed at a non-existent server; removed (D-175 open).

## Phase C: assumptions

- The design-system page is reachable in production but noindex. Gate or remove it before launch if you prefer.
- Inputs, buttons and selectable options are ≥ 44px tall everywhere (stricter than shadcn defaults).
- Countdown turns urgent under 1 minute (prop `urgentBelowMs`) and is announced once. Visual ticking is not announced.
- `formatInr` lives in `@borneo/shared` (money is shared); date formatting stays in web (presentation only, India time).
- ProductCard uses a plain `<a>` (stretched link). Route-aware links come with Phase F.
- Fonts are self-hosted via `@fontsource-variable` (no Google Fonts requests).

## Phase C: risks

- **Production hosting of Start is undecided (D-175).** The build emits a fetch handler, so a host adapter is needed before deploy.
- **Hydration and ICU.** Date and currency strings come from Intl on the server and in the browser. I normalise spaces, but a different ICU version could still change wording and cause hydration warnings. Countdown avoids this by rendering the absolute time until mount.
- **axe in jsdom does not check colour contrast or layout.** Contrast is covered by the token test, layout by manual screenshots (desktop 1280 and emulated 390 mobile, checked this phase). There is no automated visual regression yet.
- **shadcn upstream drift.** Re-running `shadcn add` can overwrite restyled base components. Diff before accepting.
- **The `/design-system` page is large** (one axe run takes ~1s). Fine now, but watch test time as it grows.
- **TS 6 pin (D-168)** must be revisited once typescript-eslint supports TS 7.

## Waiting on owner

- Review Phase C.
- Decide D-175 (Start production host) before Phase O.
- Overrule any **assumption** in DECISIONS.md or above.
- Decide **open** items when convenient: D-15, D-60, D-61, D-72, D-75.
