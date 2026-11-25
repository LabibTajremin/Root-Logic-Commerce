CREATE TABLE "courier_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"credentials" text NOT NULL,
	"webhook_token" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courier_accounts_webhookToken_unique" UNIQUE("webhook_token")
);
--> statement-breakpoint
CREATE TABLE "courier_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"raw_status" text NOT NULL,
	"state" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courier_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"account_id" uuid,
	"provider" text NOT NULL,
	"ref" text NOT NULL,
	"tracking" text NOT NULL,
	"cod" bigint NOT NULL,
	"charge" bigint,
	"raw_status" text NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courier_shipments_orderId_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "courier_accounts" ADD CONSTRAINT "courier_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_events" ADD CONSTRAINT "courier_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_events" ADD CONSTRAINT "courier_events_shipment_id_courier_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."courier_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD CONSTRAINT "courier_shipments_account_id_courier_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."courier_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courier_accounts_store_idx" ON "courier_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "courier_events_shipment_idx" ON "courier_events" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "courier_shipments_account_ref_idx" ON "courier_shipments" USING btree ("account_id","ref");--> statement-breakpoint
CREATE INDEX "courier_shipments_state_updated_idx" ON "courier_shipments" USING btree ("state","updated_at");