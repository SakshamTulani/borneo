ALTER TABLE "cart_item" DROP CONSTRAINT "cart_item_flash_sale_id_flash_sale_id_fk";
--> statement-breakpoint
ALTER TABLE "cart_item" DROP COLUMN "flash_sale_id";