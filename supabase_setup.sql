-- Supabase Database Setup Script
-- 請將此腳本複製到 Supabase Dashboard 的 SQL Editor 執行

-- 1. 建立 cases (案件) 表格
CREATE TABLE IF NOT EXISTS cases (
  "caseId" text PRIMARY KEY,
  "createdDate" text,
  "customerName" text,
  "phone" text,
  "lineId" text,
  "address" text,
  "status" text,
  "zones" jsonb DEFAULT '[]'::jsonb,
  "specialNote" text,
  "formalQuotedPrice" numeric DEFAULT 0,
  "manualPriceAdjustment" numeric DEFAULT 0,
  "finalPrice" numeric DEFAULT 0,
  "schedule" jsonb DEFAULT '[]'::jsonb,
  "changeOrders" jsonb DEFAULT '[]'::jsonb,
  "logs" jsonb DEFAULT '[]'::jsonb,
  "warrantyRecords" jsonb DEFAULT '[]'::jsonb
);

-- 2. 建立 methods (工法/方案) 表格
CREATE TABLE IF NOT EXISTS methods (
  "id" text PRIMARY KEY,
  "category" text,
  "name" text,
  "englishName" text,
  "defaultUnit" text,
  "defaultUnitPrice" numeric DEFAULT 0,
  "description" text,
  "steps" jsonb DEFAULT '[]'::jsonb,
  "estimatedDays" numeric DEFAULT 0
);

-- 3. 啟用 Row Level Security (RLS) 安全性設定
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

-- 4. 設定存取策略 (Policy)
-- 注意：這裡設定為允許所有使用者讀寫 (適合開發階段)
-- 若需限制權限，請修改此處

-- Cases 表格策略
CREATE POLICY "Enable all access for cases" ON cases
  FOR ALL USING (true) WITH CHECK (true);

-- Methods 表格策略
CREATE POLICY "Enable all access for methods" ON methods
  FOR ALL USING (true) WITH CHECK (true);
