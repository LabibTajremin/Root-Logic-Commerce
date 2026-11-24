CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"phone" text NOT NULL,
	"ip" text NOT NULL,
	"device_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_ip" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_attempts" ADD CONSTRAINT "fraud_attempts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_store_kind_value_uq" ON "blocks" USING btree ("store_id","kind","value");--> statement-breakpoint
CREATE INDEX "fraud_attempts_store_idx" ON "fraud_attempts" USING btree ("store_id","created_at");