ALTER TABLE "courier_shipments" ADD COLUMN "cod_collected" bigint;--> statement-breakpoint
ALTER TABLE "courier_shipments" ADD COLUMN "paid_out_at" timestamp with time zone;