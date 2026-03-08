-- Add labor cost fields to methods table
ALTER TABLE methods ADD COLUMN IF NOT EXISTS "laborHourlyRate" numeric DEFAULT 0;
ALTER TABLE methods ADD COLUMN IF NOT EXISTS "laborHours" numeric DEFAULT 0;
