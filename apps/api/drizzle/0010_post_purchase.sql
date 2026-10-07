CREATE TYPE "public"."tracking_step" AS ENUM('placed', 'confirmed', 'packed', 'shipped', 'outForDelivery', 'delivered');--> statement-breakpoint
ALTER TYPE "public"."hold_status" ADD VALUE 'released';--> statement-breakpoint
ALTER TYPE "public"."order_notice" ADD VALUE 'CANCELLED_BY_CUSTOMER' BEFORE 'PAYMENT_FAILED';--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"step" "tracking_step" NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "order_event_step" UNIQUE("order_id","step")
);
--> statement-breakpoint
CREATE TABLE "return_photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"return_request_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_photo_size" CHECK (octet_length("return_photo"."bytes") <= 2097152)
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refund" ADD COLUMN "return_request_id" uuid;--> statement-breakpoint
ALTER TABLE "return_request" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_photo" ADD CONSTRAINT "return_photo_return_request_id_return_request_id_fk" FOREIGN KEY ("return_request_id") REFERENCES "public"."return_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_photo" ADD CONSTRAINT "return_photo_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "return_photo_request" ON "return_photo" USING btree ("return_request_id");--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_return_request_id_return_request_id_fk" FOREIGN KEY ("return_request_id") REFERENCES "public"."return_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "return_request_open" ON "return_request" USING btree ("order_item_id") WHERE "return_request"."status" <> 'rejected';--> statement-breakpoint
CREATE UNIQUE INDEX "review_customer_product" ON "review" USING btree ("customer_id","product_id");--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_order_id_unique" UNIQUE("order_id");