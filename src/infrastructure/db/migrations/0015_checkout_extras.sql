ALTER TABLE "orders" ADD COLUMN "ship_alt_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "preferred_time" text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_wrap" boolean DEFAULT false NOT NULL;