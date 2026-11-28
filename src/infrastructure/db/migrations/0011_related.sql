ALTER TABLE "products" ADD COLUMN "related_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fbt_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;