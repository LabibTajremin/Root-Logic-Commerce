CREATE TABLE "parcel_handover_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"handover_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"rider_name" text DEFAULT '' NOT NULL,
	"rider_phone" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parcel_handover_items" ADD CONSTRAINT "parcel_handover_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_handover_items" ADD CONSTRAINT "parcel_handover_items_handover_id_parcel_handovers_id_fk" FOREIGN KEY ("handover_id") REFERENCES "public"."parcel_handovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_handover_items" ADD CONSTRAINT "parcel_handover_items_shipment_id_courier_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."courier_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_handovers" ADD CONSTRAINT "parcel_handovers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "parcel_handover_items_uq" ON "parcel_handover_items" USING btree ("handover_id","shipment_id");--> statement-breakpoint
CREATE INDEX "parcel_handovers_store_idx" ON "parcel_handovers" USING btree ("store_id","created_at");