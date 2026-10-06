CREATE TYPE "public"."order_notice" AS ENUM('PAYMENT_FAILED', 'HOLD_EXPIRED', 'CONFIRMED_AFTER_EXPIRY', 'REFUNDED_AFTER_EXPIRY');--> statement-breakpoint
CREATE SEQUENCE "public"."invoice_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."order_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "invoice" ALTER COLUMN "s3_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "hsn_code" text;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "gst_rate_bps" integer DEFAULT 1800 NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouse" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "warehouse" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "supplier_state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "place_of_supply" text NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "coupon_discount_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "payment_discount_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "payment_bank" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "emi_tenure_months" integer;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "notice" "order_notice";--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "hsn_code" text;--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN "gst_rate_bps" integer DEFAULT 1800 NOT NULL;--> statement-breakpoint
CREATE INDEX "stock_hold_active" ON "stock_hold" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_discount_parts" CHECK ("order"."discount_paise" = "order"."coupon_discount_paise" + "order"."payment_discount_paise");