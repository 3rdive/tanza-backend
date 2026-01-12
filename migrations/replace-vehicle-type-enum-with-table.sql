-- Migration: Replace vehicle type enum with vehicle type table references
-- This migration is fully self-contained:
-- 1. Creates vehicle_type table and populates it if needed
-- 2. Adds vehicleTypeId columns
-- 3. Migrates data safely
-- 4. Adds constraints and cleans up

-- Step 0: Ensure vehicle_type table exists
CREATE TABLE IF NOT EXISTS "vehicle_type" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "description" text,
    "baseFee" numeric(10,2) NOT NULL DEFAULT '0',
    "maxWeight" numeric(10,2),
    "isActive" boolean NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    CONSTRAINT "PK_vehicle_type" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_vehicle_type_name" UNIQUE ("name")
);

-- Step 0.5: Ensure default vehicle types exist
INSERT INTO "vehicle_type" ("name", "description", "baseFee", "maxWeight")
VALUES 
    ('bike', 'Motorcycle delivery', 200, 20),
    ('bicycle', 'Bicycle delivery', 100, 10),
    ('van', 'Van/Car delivery', 300, 500)
ON CONFLICT ("name") DO NOTHING;

-- Step 1: Add vehicleTypeId columns (nullable initially)
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "vehicleTypeId" uuid;
ALTER TABLE "rider_info" ADD COLUMN IF NOT EXISTS "vehicleTypeId" uuid;
ALTER TABLE "vehicle_document_settings" ADD COLUMN IF NOT EXISTS "vehicleTypeId" uuid;

-- Step 2: Migrate Data
DO $$
DECLARE
    bike_id uuid;
    bicycle_id uuid;
    van_id uuid;
BEGIN
    -- Get vehicle type IDs
    SELECT id INTO bike_id FROM vehicle_type WHERE name = 'bike' LIMIT 1;
    SELECT id INTO bicycle_id FROM vehicle_type WHERE name = 'bicycle' LIMIT 1;
    SELECT id INTO van_id FROM vehicle_type WHERE name = 'van' LIMIT 1;

    -- Update orders table: Assign 'bike' to ALL orders (as requested)
    IF bike_id IS NOT NULL THEN
        UPDATE "order" SET "vehicleTypeId" = bike_id;
    END IF;

    -- Update rider_info table
    -- Check if vehicleType column exists before trying to read it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rider_info' AND column_name = 'vehicleType') THEN
        IF bike_id IS NOT NULL THEN
            EXECUTE 'UPDATE "rider_info" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''bike''' USING bike_id;
        END IF;
        IF bicycle_id IS NOT NULL THEN
            EXECUTE 'UPDATE "rider_info" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''bicycle''' USING bicycle_id;
        END IF;
        IF van_id IS NOT NULL THEN
            EXECUTE 'UPDATE "rider_info" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''van''' USING van_id;
        END IF;
    ELSE
        -- Fallback if column is missing: Default to bike or leave null? 
        -- Let's default to bike for safety if bike_id exists
        IF bike_id IS NOT NULL THEN
            UPDATE "rider_info" SET "vehicleTypeId" = bike_id WHERE "vehicleTypeId" IS NULL;
        END IF;
    END IF;

    -- Update vehicle_document_settings table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicle_document_settings' AND column_name = 'vehicleType') THEN
        IF bike_id IS NOT NULL THEN
            EXECUTE 'UPDATE "vehicle_document_settings" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''bike''' USING bike_id;
        END IF;
        IF bicycle_id IS NOT NULL THEN
            EXECUTE 'UPDATE "vehicle_document_settings" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''bicycle''' USING bicycle_id;
        END IF;
        IF van_id IS NOT NULL THEN
            EXECUTE 'UPDATE "vehicle_document_settings" SET "vehicleTypeId" = $1 WHERE "vehicleType"::text = ''van''' USING van_id;
        END IF;
    END IF;

    -- Fallback: Default to bike for any settings that didn't get updated (or if column didn't exist)
    IF bike_id IS NOT NULL THEN
        UPDATE "vehicle_document_settings" SET "vehicleTypeId" = bike_id WHERE "vehicleTypeId" IS NULL;
    END IF;
END $$;

-- Step 3: Add foreign key constraints
ALTER TABLE "order" 
DROP CONSTRAINT IF EXISTS "FK_order_vehicleType";

ALTER TABLE "order" 
ADD CONSTRAINT "FK_order_vehicleType" 
FOREIGN KEY ("vehicleTypeId") 
REFERENCES "vehicle_type"("id") 
ON DELETE SET NULL;

ALTER TABLE "rider_info" 
DROP CONSTRAINT IF EXISTS "FK_rider_info_vehicleType";

ALTER TABLE "rider_info" 
ADD CONSTRAINT "FK_rider_info_vehicleType" 
FOREIGN KEY ("vehicleTypeId") 
REFERENCES "vehicle_type"("id") 
ON DELETE SET NULL;

ALTER TABLE "vehicle_document_settings" 
DROP CONSTRAINT IF EXISTS "FK_vehicle_document_settings_vehicleType";

ALTER TABLE "vehicle_document_settings" 
ADD CONSTRAINT "FK_vehicle_document_settings_vehicleType" 
FOREIGN KEY ("vehicleTypeId") 
REFERENCES "vehicle_type"("id") 
ON DELETE SET NULL;

-- Step 4: Drop the old enum columns
ALTER TABLE "order" DROP COLUMN IF EXISTS "vehicleType";
ALTER TABLE "rider_info" DROP COLUMN IF EXISTS "vehicleType";
ALTER TABLE "vehicle_document_settings" DROP COLUMN IF EXISTS "vehicleType";

-- Step 5: Drop the enum type if it exists
DROP TYPE IF EXISTS "order_vehicletype_enum";
DROP TYPE IF EXISTS "rider_info_vehicletype_enum";
DROP TYPE IF EXISTS "vehicle_document_settings_vehicletype_enum";
