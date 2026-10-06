# 0007. Layered feature slices with enforced boundaries

- Status: proposed
- Date: 2026-10-06

## Context
Many features across web and API; category-specific experiences on a shared foundation. Needs to stay maintainable as it grows.

## Options
1. Feature slices with fixed layers, downward-only imports, public `index.ts`, checked by dependency-cruiser.
2. Layer-first folders (components/, hooks/, services/).
3. Conventions without enforcement.

## Decision
Option 1. Web: `routes → ui → hooks → repository → mappers/api → model`. API: `route → service → repository → db`. Cross-feature/module only via `index.ts`. Rules in `packages/shared`.

## Consequences
- \+ Features are easy to find, change and delete; boundaries checked in `pnpm check`.
- − More files and some ceremony per feature.
