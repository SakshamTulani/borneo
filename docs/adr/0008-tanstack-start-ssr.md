# 0008. TanStack Start with SSR (supersedes 0001)

- Status: accepted
- Date: 2026-10-06

## Context

ADR-0001 chose a Vite SPA and deferred SEO as a production blocker. Owner wants SSR and SEO from the start. Product and category pages must be crawlable and shareable with real previews.

## Options

1. Keep Vite SPA, prerender later (ADR-0001).
2. TanStack Start (SSR + streaming on Vite, same TanStack Router and Query).
3. Next.js / React Router framework mode.

## Decision

Option 2.

- Fastify stays the **only** API and owner of business logic. Start route loaders and server functions only fetch from it (forwarding the session cookie on SSR). No business rules or DB access in the web server.
- File-based routes in `src/routes/` stay thin. Feature slices unchanged (ADR-0007).
- Head/meta per route via Start's `head()`; one helper builds title/meta/canonical.
- Query data from SSR loaders is dehydrated into the client cache (no double fetch).

## Consequences

- \+ SEO and link previews in v1. D-162 is no longer a production blocker.
- \+ Same router/query APIs as planned; little rework.
- − The web app is now a Node server (deploy, health check, env), not static files.
- − Every component must be SSR-safe: no `window`/`localStorage` at render. Leaflet loads client-only.
- − Generated `routeTree.gen.ts` excluded from lint/format/boundary checks.
