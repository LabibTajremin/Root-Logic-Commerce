ALTER TYPE "public"."order_status" ADD VALUE 'ON_HOLD';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'SCHEDULED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'COURIER_HOLD';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'PARTIAL_DELIVERED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'RETURNING';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'RETURN_RECEIVED';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'RETURN_MISSING';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" timestamp with time zone;