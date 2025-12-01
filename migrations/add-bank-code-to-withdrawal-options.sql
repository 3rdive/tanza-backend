-- Add bank_code column to withdrawal_options table for Paystack integration
ALTER TABLE withdrawal_options ADD COLUMN bank_code VARCHAR(10) NOT NULL DEFAULT '';