-- Island7 Operational Upgrade Migration
-- 用途：升級既有 Supabase cases 表，補齊營運版欄位

ALTER TABLE cases ADD COLUMN IF NOT EXISTS "startDate" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "contractSignedDate" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "completionAcceptedDate" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "siteContactName" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "siteContactPhone" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "latitude" numeric;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "longitude" numeric;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "addressNote" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "buildingContext" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "leakSymptoms" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "leakSourceDiagnosis" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "accessConstraints" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "quoteVersion" numeric DEFAULT 1;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "depositPercentage" numeric DEFAULT 0.7;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "depositReceivedDate" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "finalPaymentReceivedDate" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "invoiceTitle" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "invoiceTaxId" text;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS "paymentNote" text;

ALTER TABLE cases ALTER COLUMN "zones" SET DEFAULT '[]'::jsonb;
ALTER TABLE cases ALTER COLUMN "schedule" SET DEFAULT '[]'::jsonb;
ALTER TABLE cases ALTER COLUMN "changeOrders" SET DEFAULT '[]'::jsonb;
ALTER TABLE cases ALTER COLUMN "logs" SET DEFAULT '[]'::jsonb;
ALTER TABLE cases ALTER COLUMN "warrantyRecords" SET DEFAULT '[]'::jsonb;

UPDATE cases
SET
  "quoteVersion" = COALESCE("quoteVersion", 1),
  "depositPercentage" = 0.7,
  "invoiceTitle" = COALESCE(NULLIF("invoiceTitle", ''), "customerName"),
  "siteContactName" = COALESCE(NULLIF("siteContactName", ''), "customerName"),
  "siteContactPhone" = COALESCE(NULLIF("siteContactPhone", ''), "phone"),
  "zones" = COALESCE("zones", '[]'::jsonb),
  "schedule" = COALESCE("schedule", '[]'::jsonb),
  "changeOrders" = COALESCE("changeOrders", '[]'::jsonb),
  "logs" = COALESCE("logs", '[]'::jsonb),
  "warrantyRecords" = COALESCE("warrantyRecords", '[]'::jsonb);
