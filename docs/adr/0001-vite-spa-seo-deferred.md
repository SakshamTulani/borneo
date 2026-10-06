# 0001. Vite SPA now, SEO deferred

- Status: superseded by 0008
- Date: 2026-10-06

## Context

Demo/MVP needs a fast build loop and simple hosting. A public store needs SEO eventually.

## Options

1. Vite SPA, SEO later (prerender or SSR).
2. SSR framework from day one (e.g. TanStack Start, Next.js).

## Decision

Option 1. Keep SEO cheap to add: one URL per product/category, title/meta in one place, semantic HTML.

## Consequences

- \+ Simplest dev/deploy; static hosting.
- − Crawlers and link previews see little content. SEO is a production blocker (D-162).
- Later: prerender first (low cost); SSR only if freshness demands it (higher cost).
