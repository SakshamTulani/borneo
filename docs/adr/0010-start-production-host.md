# 0010. Production host for the Start server: a small Node server with srvx

- Status: proposed
- Date: 2026-10-07

## Context

`vite build` produces `dist/server/server.js`, whose default export is `{ fetch(request) }` (a web fetch handler), plus static client assets in `dist/client`. Nothing serves it yet (D-175 open), so the web app can't run outside `vite dev`. Production also needs: static assets with long cache headers, gzip/brotli, the `/api` path forwarded to Fastify with the shopper's IP (rate limits trust `X-Forwarded-For` only from configured proxies, D-190), and graceful shutdown.

## Options

1. **srvx** (`srvx/node`): a tiny adapter that runs a fetch handler on Node's HTTP server. We add a ~40-line `server.ts`: static files from `dist/client` (immutable cache for hashed assets), everything else to `server.fetch`. `/api` is routed by the reverse proxy (or the same file proxies it).
2. **Nitro** (Start's Nitro/Vinxi preset `node-server`): a full server build with static handling and compression built in; more moving parts and another build layer to learn and upgrade.
3. **Hand-written `node:http` adapter**: convert `IncomingMessage` to `Request` ourselves. No dependency, but streaming, headers and abort handling are easy to get subtly wrong.
4. **A platform** (Vercel, Netlify, Cloudflare): their adapters host the fetch handler; ties hosting choice and cost to the web tier while the API, Postgres, MinIO and pg-boss still need a Node host.

## Decision

Proposed: Option 1. One container image runs two Node processes behind one reverse proxy (Caddy or nginx): Fastify on `:3000` (`/api`, path rewritten as in dev) and the srvx server on `:5173` (everything else). The proxy terminates TLS, compresses, and sets `X-Forwarded-For`; `TRUST_PROXY` names it. Static assets are served by srvx with `Cache-Control: public, max-age=31536000, immutable` for hashed files and `no-cache` for HTML.

Not built until this ADR is accepted (`docs/adr/README.md`).

## Consequences

- \+ Same runtime everywhere (Node 24), one image, no platform lock-in; dev and prod share the fetch handler.
- \+ srvx is small and follows web standards; swapping to Nitro later only replaces `server.ts`.
- − We own static serving and headers; a CDN in front is still advisable for images and assets.
- − New dependency (`srvx`) in `apps/web`.
- − Two processes per container: needs a process manager or two containers in one pod.
