
-- 復原/修正資料庫權限的腳本
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 1. 確保 materials 表格權限
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for materials" ON materials;
CREATE POLICY "Enable all access for materials" ON materials FOR ALL USING (true) WITH CHECK (true);

-- 2. 確保 method_recipes 表格權限
ALTER TABLE method_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for method_recipes" ON method_recipes;
CREATE POLICY "Enable all access for method_recipes" ON method_recipes FOR ALL USING (true) WITH CHECK (true);

-- 3. 以防萬一，也補上 methods 的權限確認
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for methods" ON methods;
CREATE POLICY "Enable all access for methods" ON methods FOR ALL USING (true) WITH CHECK (true);
