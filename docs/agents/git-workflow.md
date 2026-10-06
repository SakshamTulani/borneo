# Git workflow

- Remote: `git@github.com:SakshamTulani/borneo.git`. `main` holds only reviewed work.
- One branch per roadmap phase: `phase-<letter>/<name>` (e.g. `phase-c/shared-rules`), branched from the previous phase branch until the owner merges.
- No PRs. **Never merge or push without the owner's OK.**
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`), imperative, ≤ 72 chars subject.
- lefthook pre-commit runs `pnpm check`. Never use `--no-verify`.
- Commit generated files that are part of the build contract: `drizzle/` migrations and meta, `pnpm-lock.yaml`. Do not commit `routeTree.gen.ts` changes by hand (Start regenerates it).
- End of each phase: update `docs/ROADMAP.md` status and `docs/PROGRESS.md`, commit, stop, ask the owner.
- ADRs: write as `proposed`; only the owner sets `accepted`. No code may depend on a non-accepted ADR.
