ALTER TABLE "media" ADD COLUMN "url" text NOT NULL;--> statement-breakpoint
CREATE INDEX "media_product" ON "media" USING btree ("product_id","sort");--> statement-breakpoint
ALTER TABLE "media" DROP COLUMN "s3_key";--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_url_https" CHECK ("media"."url" like 'https://%');