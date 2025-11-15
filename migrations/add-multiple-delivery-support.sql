-- Migration: Add Multiple Delivery Support
-- Date: 2025-11-15
-- Description: Adds DeliveryDestination table and hasMultipleDeliveries field to Order table

-- Create delivery_destination table
CREATE TABLE IF NOT EXISTS delivery_destination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL,
  "dropOffLocation" JSONB NOT NULL,
  recipient JSONB NOT NULL,
  "distanceFromPickupKm" DECIMAL(10,4) NOT NULL,
  "durationFromPickup" VARCHAR(255) NOT NULL,
  "deliveryFee" DECIMAL(10,2) NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_delivery_destination_order 
    FOREIGN KEY ("orderId") 
    REFERENCES "order"(id) 
    ON DELETE CASCADE
);

-- Add hasMultipleDeliveries column to order table
ALTER TABLE "order" 
ADD COLUMN IF NOT EXISTS "hasMultipleDeliveries" BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_destination_order 
ON delivery_destination("orderId");

CREATE INDEX IF NOT EXISTS idx_delivery_destination_delivered 
ON delivery_destination(delivered);

-- Add comments for documentation
COMMENT ON TABLE delivery_destination IS 'Stores individual delivery destinations for orders with multiple drop-off locations';
COMMENT ON COLUMN delivery_destination."orderId" IS 'Reference to the parent order';
COMMENT ON COLUMN delivery_destination."dropOffLocation" IS 'JSON object containing longitude, latitude, and address';
COMMENT ON COLUMN delivery_destination.recipient IS 'JSON object containing recipient name, email, phone, and role';
COMMENT ON COLUMN delivery_destination."distanceFromPickupKm" IS 'Distance in kilometers from pickup location to this delivery destination';
COMMENT ON COLUMN delivery_destination."durationFromPickup" IS 'Estimated travel duration from pickup to this destination';
COMMENT ON COLUMN delivery_destination."deliveryFee" IS 'Fee charged for delivering to this specific destination';
COMMENT ON COLUMN delivery_destination.delivered IS 'Flag indicating if this destination has been delivered';
COMMENT ON COLUMN delivery_destination."deliveredAt" IS 'Timestamp when delivery to this destination was completed';

COMMENT ON COLUMN "order"."hasMultipleDeliveries" IS 'Flag indicating if this order has multiple delivery destinations';

-- Rollback script (save this for reference)
/*
-- To rollback this migration:

DROP INDEX IF EXISTS idx_delivery_destination_delivered;
DROP INDEX IF EXISTS idx_delivery_destination_order;
ALTER TABLE "order" DROP COLUMN IF EXISTS "hasMultipleDeliveries";
DROP TABLE IF EXISTS delivery_destination;
*/
