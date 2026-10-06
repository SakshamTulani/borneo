ALTER TABLE "cart_item" DROP CONSTRAINT "cart_item_line";--> statement-breakpoint
ALTER TABLE "cart_item" DROP CONSTRAINT "cart_item_flash_not_bundle";--> statement-breakpoint
ALTER TABLE "cart_item" DROP CONSTRAINT "cart_item_qty_positive";--> statement-breakpoint
ALTER TABLE "cart" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "cart_item" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_line" UNIQUE NULLS NOT DISTINCT("cart_id","variant_id","bundle_id");--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_qty" CHECK ("cart_item"."qty" between 1 and 5);