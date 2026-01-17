
-- 完整初始化腳本：建立材料與配方表格 + 設定權限
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 1. 建立 materials (材料) 表格
CREATE TABLE IF NOT EXISTS materials (
  "id" text PRIMARY KEY,
  "name" text,
  "brand" text,
  "unit" text,
  "unitPrice" numeric,
  "costPerVal" numeric,
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- 2. 建立 method_recipes (配方) 表格
CREATE TABLE IF NOT EXISTS method_recipes (
  "id" text PRIMARY KEY,
  "methodId" text,
  "materialId" text,
  "quantity" numeric,
  "category" text,
  "consumptionRate" numeric,
  "note" text
);

-- 3. 啟用 RLS 並設定權限
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE method_recipes ENABLE ROW LEVEL SECURITY;

-- 移除舊策略 (避免重複報錯)
DROP POLICY IF EXISTS "Enable all access for materials" ON materials;
DROP POLICY IF EXISTS "Enable all access for method_recipes" ON method_recipes;

-- 建立新策略 (允許所有讀寫)
CREATE POLICY "Enable all access for materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for method_recipes" ON method_recipes FOR ALL USING (true) WITH CHECK (true);

-- 4. 確保 methods 表格權限 (以防萬一)
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for methods" ON methods;
CREATE POLICY "Enable all access for methods" ON methods FOR ALL USING (true) WITH CHECK (true);
