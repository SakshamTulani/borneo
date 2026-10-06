ALTER TABLE "review" ADD COLUMN "author_name" text;--> statement-breakpoint
-- Existing reviews: first name and last initial from the reviewer's account (D-150).
UPDATE "review" r SET "author_name" = CASE
  WHEN position(' ' in trim(u."name")) = 0 THEN coalesce(nullif(trim(u."name"), ''), 'Verified buyer')
  ELSE split_part(trim(u."name"), ' ', 1) || ' ' || upper(left(regexp_replace(trim(u."name"), '^.*\s', ''), 1)) || '.'
END
FROM "user" u WHERE u."id" = r."customer_id";--> statement-breakpoint
ALTER TABLE "review" ALTER COLUMN "author_name" SET NOT NULL;
