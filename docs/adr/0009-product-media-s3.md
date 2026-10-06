# 0009. Product media in S3-compatible storage via the AWS SDK

- Status: proposed
- Date: 2026-10-06

## Context

Product cards and pages need images (PRD: rich media, D-14). ARCHITECTURE already names MinIO (S3 API) for product media, return photos and invoices, and `media.s3_key` exists, but nothing talks to S3 yet. There are no real Borneo product photos, and stock photos would show other brands' devices.

## Options

1. `@aws-sdk/client-s3` in the API; public-read `media/` prefix; the API returns absolute image URLs built from `S3_PUBLIC_URL`.
2. Hand-written SigV4 requests with `node:crypto` (no dependency).
3. Static files in `apps/web/public` (bypasses MinIO; moves later).
4. `minio` npm client.

## Decision

Option 1. Seed images are studio-style SVG renders generated in code per product and variant colour (`db/seed/media`), uploaded by `db:reset` and recorded in `media`. Only the `media/` prefix is anonymous-read; return photos and invoices (later) stay private and use presigned URLs from the same client.

## Consequences

- \+ Standard, maintained client; works unchanged against AWS S3, R2 or MinIO in production.
- \+ Images follow the architecture (MinIO) and the existing `media` table.
- \+ Generated renders are honest placeholders: no fake photos of other brands.
- − Adds a sizeable dependency to the API (tree-shaken per command).
- − `db:reset` now needs MinIO running as well as Postgres.
- − Real product photography replaces the renders before launch (listed as a content blocker).
