CREATE TYPE "public"."attribute_type" AS ENUM('enum', 'number', 'bool', 'text', 'list');--> statement-breakpoint
CREATE TYPE "public"."category_depth" AS ENUM('full', 'template');--> statement-breakpoint
CREATE TYPE "public"."family_tier" AS ENUM('standard', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'live', 'preorder', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."product_tier" AS ENUM('value', 'upper_mid', 'premium');--> statement-breakpoint
CREATE TYPE "public"."return_policy" AS ENUM('return', 'replacementOnly');--> statement-breakpoint
CREATE TYPE "public"."override_action" AS ENUM('add', 'remove');--> statement-breakpoint
CREATE TYPE "public"."relation_source" AS ENUM('rule', 'manual', 'line');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('accessory', 'compatible', 'complementary', 'replacement', 'consumable', 'upgrade', 'prev_gen', 'next_gen', 'family_tier', 'bundle_member');--> statement-breakpoint
CREATE TYPE "public"."offer_kind" AS ENUM('coupon', 'bank', 'no_cost_emi');--> statement-breakpoint
CREATE TYPE "public"."hold_status" AS ENUM('active', 'converted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'paid', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('upi', 'card', 'emi', 'cod');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('started', 'succeeded', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."return_kind" AS ENUM('return', 'replacement');--> statement-breakpoint
CREATE TYPE "public"."return_reason" AS ENUM('defect', 'damage', 'changedMind', 'other');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('created', 'in_transit', 'out_for_delivery', 'delivered');--> statement-breakpoint
CREATE TABLE "attribute_def" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "attribute_type" NOT NULL,
	"unit" text,
	"options" text[],
	"filterable" boolean DEFAULT false NOT NULL,
	"comparable" boolean DEFAULT false NOT NULL,
	"compat" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "attribute_def_compat_not_text" CHECK (not ("attribute_def"."compat" and "attribute_def"."type" = 'text'))
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"depth" "category_depth" NOT NULL,
	"config" jsonb NOT NULL,
	"return_policy" "return_policy" NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "faq" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "faq_one_owner" CHECK (num_nonnulls("faq"."product_id", "faq"."category_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"kind" "media_kind" NOT NULL,
	"s3_key" text NOT NULL,
	"alt" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"model_number" text NOT NULL,
	"generation" integer NOT NULL,
	"tier" "product_tier" NOT NULL,
	"family_tier" "family_tier" NOT NULL,
	"status" "product_status" NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"explainer" text,
	"who_for" text,
	"not_for" text,
	"launched_at" date,
	"dispatch_from" date,
	"dispatch_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_model_number_unique" UNIQUE("model_number"),
	CONSTRAINT "product_generation_positive" CHECK ("product"."generation" > 0),
	CONSTRAINT "product_preorder_dispatch" CHECK ("product"."status" <> 'preorder' or ("product"."dispatch_from" is not null and "product"."dispatch_to" >= "product"."dispatch_from"))
);
--> statement-breakpoint
CREATE TABLE "product_line" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_synonym" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"synonyms" text[] NOT NULL,
	CONSTRAINT "search_synonym_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mrp_paise" bigint NOT NULL,
	"price_paise" bigint NOT NULL,
	"preorder_cap" integer,
	"preorder_sold" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variant_price_le_mrp" CHECK ("variant"."price_paise" > 0 and "variant"."price_paise" <= "variant"."mrp_paise"),
	CONSTRAINT "variant_preorder_sold" CHECK ("variant"."preorder_sold" >= 0 and ("variant"."preorder_cap" is null or "variant"."preorder_sold" <= "variant"."preorder_cap"))
);
--> statement-breakpoint
CREATE TABLE "relation" (
	"from_product_id" uuid NOT NULL,
	"to_product_id" uuid NOT NULL,
	"type" "relation_type" NOT NULL,
	"source" "relation_source" NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "relation_from_product_id_to_product_id_type_pk" PRIMARY KEY("from_product_id","to_product_id","type")
);
--> statement-breakpoint
CREATE TABLE "relation_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_product_id" uuid NOT NULL,
	"to_product_id" uuid NOT NULL,
	"type" "relation_type" NOT NULL,
	"action" "override_action" NOT NULL,
	"reason" text,
	CONSTRAINT "relation_override_not_self" CHECK ("relation_override"."from_product_id" <> "relation_override"."to_product_id")
);
--> statement-breakpoint
CREATE TABLE "relation_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "relation_type" NOT NULL,
	"from_category_id" uuid NOT NULL,
	"to_category_id" uuid NOT NULL,
	"match" jsonb NOT NULL,
	"reason_template" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"price_paise" bigint NOT NULL,
	"active_from" timestamp with time zone NOT NULL,
	"active_to" timestamp with time zone,
	CONSTRAINT "bundle_slug_unique" UNIQUE("slug"),
	CONSTRAINT "bundle_price_positive" CHECK ("bundle"."price_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "bundle_item" (
	"bundle_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "bundle_item_bundle_id_variant_id_pk" PRIMARY KEY("bundle_id","variant_id"),
	CONSTRAINT "bundle_item_qty_positive" CHECK ("bundle_item"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "disposable_domain" (
	"domain" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emi_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank" text NOT NULL,
	"tenure_months" integer NOT NULL,
	"annual_rate_bps" integer NOT NULL,
	"min_amount_paise" bigint NOT NULL,
	CONSTRAINT "emi_plan_tenure_positive" CHECK ("emi_plan"."tenure_months" > 0),
	CONSTRAINT "emi_plan_amounts" CHECK ("emi_plan"."annual_rate_bps" >= 0 and "emi_plan"."min_amount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "flash_sale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"sale_price_paise" bigint NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cap" integer NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "flash_sale_window" CHECK ("flash_sale"."ends_at" > "flash_sale"."starts_at"),
	CONSTRAINT "flash_sale_sold" CHECK ("flash_sale"."sold" >= 0 and "flash_sale"."sold" <= "flash_sale"."cap"),
	CONSTRAINT "flash_sale_limit_one" CHECK ("flash_sale"."per_customer_limit" = 1),
	CONSTRAINT "flash_sale_price_cap" CHECK ("flash_sale"."sale_price_paise" > 0 and "flash_sale"."cap" > 0)
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"rules" jsonb NOT NULL,
	"applies_to_all" boolean DEFAULT false NOT NULL,
	"active_from" timestamp with time zone NOT NULL,
	"active_to" timestamp with time zone NOT NULL,
	CONSTRAINT "offer_coupon_has_code" CHECK (("offer"."kind" = 'coupon') = ("offer"."code" is not null)),
	CONSTRAINT "offer_window" CHECK ("offer"."active_to" > "offer"."active_from")
);
--> statement-breakpoint
CREATE TABLE "delivery_lane" (
	"warehouse_id" uuid NOT NULL,
	"pincode_prefix" text NOT NULL,
	"min_days" integer NOT NULL,
	"max_days" integer NOT NULL,
	CONSTRAINT "delivery_lane_warehouse_id_pincode_prefix_pk" PRIMARY KEY("warehouse_id","pincode_prefix"),
	CONSTRAINT "delivery_lane_prefix" CHECK ("delivery_lane"."pincode_prefix" ~ '^[0-9]{0,6}$'),
	CONSTRAINT "delivery_lane_days" CHECK ("delivery_lane"."min_days" >= 0 and "delivery_lane"."max_days" >= "delivery_lane"."min_days")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"warehouse_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_warehouse_id_variant_id_pk" PRIMARY KEY("warehouse_id","variant_id"),
	CONSTRAINT "inventory_bounds" CHECK ("inventory"."reserved" >= 0 and "inventory"."reserved" <= "inventory"."on_hand")
);
--> statement-breakpoint
CREATE TABLE "serviceability" (
	"pincode" text NOT NULL,
	"category_id" uuid NOT NULL,
	"deliverable" boolean NOT NULL,
	"cod_allowed" boolean NOT NULL,
	CONSTRAINT "serviceability_pincode_category_id_pk" PRIMARY KEY("pincode","category_id"),
	CONSTRAINT "serviceability_pincode" CHECK ("serviceability"."pincode" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "serviceability_cod_needs_delivery" CHECK ("serviceability"."deliverable" or not "serviceability"."cod_allowed")
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"pincode" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	CONSTRAINT "warehouse_code_unique" UNIQUE("code"),
	CONSTRAINT "warehouse_pincode" CHECK ("warehouse"."pincode" ~ '^[1-9][0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"landmark" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "address_pincode" CHECK ("address"."pincode" ~ '^[1-9][0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "customer_profile" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "watch" (
	"customer_id" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_customer_id_variant_id_pk" PRIMARY KEY("customer_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid,
	"bundle_id" uuid,
	"flash_sale_id" uuid,
	"qty" integer NOT NULL,
	CONSTRAINT "cart_item_line" UNIQUE NULLS NOT DISTINCT("cart_id","variant_id","bundle_id","flash_sale_id"),
	CONSTRAINT "cart_item_one_target" CHECK (num_nonnulls("cart_item"."variant_id", "cart_item"."bundle_id") = 1),
	CONSTRAINT "cart_item_flash_not_bundle" CHECK (not ("cart_item"."bundle_id" is not null and "cart_item"."flash_sale_id" is not null)),
	CONSTRAINT "cart_item_qty_positive" CHECK ("cart_item"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "flash_purchase" (
	"flash_sale_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"order_id" uuid NOT NULL,
	CONSTRAINT "flash_purchase_flash_sale_id_customer_id_pk" PRIMARY KEY("flash_sale_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"number" text NOT NULL,
	"s3_key" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "invoice_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text NOT NULL,
	"number" text NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"address" jsonb NOT NULL,
	"subtotal_paise" bigint NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint NOT NULL,
	"coupon_offer_id" uuid,
	"payment_offer_id" uuid,
	"payment_method" "payment_method" NOT NULL,
	"is_preorder" boolean DEFAULT false NOT NULL,
	"eta_from" date,
	"eta_to" date,
	"idempotency_key" text NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_number_unique" UNIQUE("number"),
	CONSTRAINT "order_amounts" CHECK ("order"."discount_paise" >= 0 and "order"."total_paise" >= 0),
	CONSTRAINT "order_total" CHECK ("order"."total_paise" = "order"."subtotal_paise" - "order"."discount_paise"),
	CONSTRAINT "order_preorder_no_cod" CHECK (not ("order"."is_preorder" and "order"."payment_method" = 'cod'))
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"product_name" text NOT NULL,
	"return_policy" "return_policy" NOT NULL,
	"qty" integer NOT NULL,
	"mrp_paise" bigint NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"warehouse_id" uuid,
	"bundle_id" uuid,
	"flash_sale_id" uuid,
	"return_window_ends_at" timestamp with time zone,
	CONSTRAINT "order_item_qty_positive" CHECK ("order_item"."qty" > 0),
	CONSTRAINT "order_item_amounts" CHECK ("order_item"."unit_price_paise" > 0 and "order_item"."unit_price_paise" <= "order_item"."mrp_paise" and "order_item"."discount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"gateway_ref" text,
	"method" "payment_method" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"status" "payment_status" DEFAULT 'started' NOT NULL,
	"idempotency_key" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"succeeded_at" timestamp with time zone,
	CONSTRAINT "payment_amount_positive" CHECK ("payment"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_amount_positive" CHECK ("refund"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "return_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"kind" "return_kind" NOT NULL,
	"reason" "return_reason" NOT NULL,
	"details" text,
	"photo_keys" text[] DEFAULT '{}' NOT NULL,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_request_photos" CHECK ("return_request"."reason" not in ('defect', 'damage') or cardinality("return_request"."photo_keys") > 0)
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" text NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_order_item_id_unique" UNIQUE("order_item_id"),
	CONSTRAINT "review_rating" CHECK ("review"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "shipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"courier" text NOT NULL,
	"tracking_no" text NOT NULL,
	"status" "shipment_status" DEFAULT 'created' NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"warehouse_id" uuid,
	"variant_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "stock_hold_qty_positive" CHECK ("stock_hold"."qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "attribute_def" ADD CONSTRAINT "attribute_def_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq" ADD CONSTRAINT "faq_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq" ADD CONSTRAINT "faq_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_line_id_product_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."product_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_line" ADD CONSTRAINT "product_line_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant" ADD CONSTRAINT "variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation" ADD CONSTRAINT "relation_from_product_id_product_id_fk" FOREIGN KEY ("from_product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation" ADD CONSTRAINT "relation_to_product_id_product_id_fk" FOREIGN KEY ("to_product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_override" ADD CONSTRAINT "relation_override_from_product_id_product_id_fk" FOREIGN KEY ("from_product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_override" ADD CONSTRAINT "relation_override_to_product_id_product_id_fk" FOREIGN KEY ("to_product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_rule" ADD CONSTRAINT "relation_rule_from_category_id_category_id_fk" FOREIGN KEY ("from_category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relation_rule" ADD CONSTRAINT "relation_rule_to_category_id_category_id_fk" FOREIGN KEY ("to_category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_item" ADD CONSTRAINT "bundle_item_bundle_id_bundle_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_item" ADD CONSTRAINT "bundle_item_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flash_sale" ADD CONSTRAINT "flash_sale_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_lane" ADD CONSTRAINT "delivery_lane_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "serviceability" ADD CONSTRAINT "serviceability_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch" ADD CONSTRAINT "watch_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_bundle_id_bundle_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_flash_sale_id_flash_sale_id_fk" FOREIGN KEY ("flash_sale_id") REFERENCES "public"."flash_sale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flash_purchase" ADD CONSTRAINT "flash_purchase_flash_sale_id_flash_sale_id_fk" FOREIGN KEY ("flash_sale_id") REFERENCES "public"."flash_sale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flash_purchase" ADD CONSTRAINT "flash_purchase_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_coupon_offer_id_offer_id_fk" FOREIGN KEY ("coupon_offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_payment_offer_id_offer_id_fk" FOREIGN KEY ("payment_offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_bundle_id_bundle_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_flash_sale_id_flash_sale_id_fk" FOREIGN KEY ("flash_sale_id") REFERENCES "public"."flash_sale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_request" ADD CONSTRAINT "return_request_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_hold" ADD CONSTRAINT "stock_hold_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_hold" ADD CONSTRAINT "stock_hold_warehouse_id_warehouse_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_hold" ADD CONSTRAINT "stock_hold_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_def_category_key" ON "attribute_def" USING btree ("category_id","key");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_line_idx" ON "product" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "product_attributes" ON "product" USING gin ("attributes");--> statement-breakpoint
CREATE INDEX "product_name_trgm" ON "product" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "product_model_number_trgm" ON "product" USING gin ("model_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "variant_product" ON "variant" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variant_sku_trgm" ON "variant" USING gin ("sku" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "relation_to" ON "relation" USING btree ("to_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emi_plan_bank_tenure" ON "emi_plan" USING btree ("bank","tenure_months");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_code" ON "offer" USING btree (upper("code"));--> statement-breakpoint
CREATE INDEX "inventory_variant" ON "inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "address_customer" ON "address" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "notification_customer" ON "notification" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "cart_item_cart" ON "cart_item" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "order_customer" ON "order" USING btree ("customer_id","placed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_idempotency" ON "order" USING btree ("customer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_order" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_gateway_ref" ON "payment" USING btree ("gateway_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_idempotency" ON "payment" USING btree ("order_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "return_request_customer" ON "return_request" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "review_product" ON "review" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_hold_order" ON "stock_hold" USING btree ("order_id");