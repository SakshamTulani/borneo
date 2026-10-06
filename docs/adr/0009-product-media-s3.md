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

Revised 2026-10-06 on owner direction (D-180): for now, product photos are hosted sample photos (Unsplash) referenced by absolute URL in `media.url`; nothing is uploaded. The web app requests sized variants (`imageSource`, srcSet).

When we store our own files, Option 1: return photos and invoices go to a private bucket via `@aws-sdk/client-s3` with presigned URLs, and product photos move to a public-read `media/` prefix whose URLs go into the same `media.url` column. That part is still proposed and not built.

## Consequences

- \+ Real-looking photos today with no storage work; `db:reset` still needs only Postgres.
- \+ `media.url` works unchanged for any host (Unsplash now, S3/R2/MinIO public URL later).
- − Hotlinked third-party images: the site depends on Unsplash availability, and photos are not Borneo products (chosen to avoid visible logos). Launch blocker: replace with Borneo photography.
- − No private storage yet; return photos (Phase L) and invoices (Phase K) need the S3 client when they arrive.
