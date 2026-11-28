CREATE TABLE "store_features" (
	"store_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_features_store_id_feature_pk" PRIMARY KEY("store_id","feature")
);
--> statement-breakpoint
ALTER TABLE "store_features" ADD CONSTRAINT "store_features_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;