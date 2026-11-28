CREATE TABLE "checkout_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"district" text NOT NULL,
	"area" text NOT NULL,
	"address" text NOT NULL,
	"note" text NOT NULL,
	"zone_id" text NOT NULL,
	"items" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_drafts" ADD CONSTRAINT "checkout_drafts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_drafts_store_phone_uq" ON "checkout_drafts" USING btree ("store_id","phone");