
-- 緊急修復：解鎖 methods 表格權限
-- 請在 Supabase Dashboard > SQL Editor 執行

ALTER TABLE methods ENABLE ROW LEVEL SECURITY;

-- 嘗試刪除舊策略 (如果存在)
DROP POLICY IF EXISTS "Enable all access for methods" ON methods;
DROP POLICY IF EXISTS "Allow_All_Methods_V2" ON methods;

-- 建立新策略 (使用新名稱以確保生效)
CREATE POLICY "Allow_All_Methods_V2" ON methods FOR ALL USING (true) WITH CHECK (true);
