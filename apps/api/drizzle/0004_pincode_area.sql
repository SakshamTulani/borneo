CREATE TABLE "pincode_area" (
	"pincode" text PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	CONSTRAINT "pincode_area_pincode" CHECK ("pincode_area"."pincode" ~ '^[1-9][0-9]{5}$'),
	CONSTRAINT "pincode_area_lat" CHECK ("pincode_area"."lat" between -90 and 90),
	CONSTRAINT "pincode_area_lng" CHECK ("pincode_area"."lng" between -180 and 180)
);
--> statement-breakpoint
CREATE INDEX "pincode_area_lat_lng" ON "pincode_area" USING btree ("lat","lng");