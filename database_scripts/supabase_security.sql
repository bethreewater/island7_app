-- 安全性更新腳本 (Security Update Script)
-- 目的：將資料庫權限從「公開」改為「僅限登入使用者」
-- 請將此腳本複製到 Supabase Dashboard 的 SQL Editor 執行

-- 1. 重設 Cases (案件) 表格權限
DROP POLICY IF EXISTS "Enable all access for cases" ON cases;
CREATE POLICY "Allow authenticated access for cases" ON cases
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 2. 重設 Methods (工法) 表格權限
DROP POLICY IF EXISTS "Enable all access for methods" ON methods;
CREATE POLICY "Allow authenticated access for methods" ON methods
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 說明：
-- 執行後，未登入的使用者將無法讀取或修改資料。
-- 請確認您的應用程式已實作登入功能 (Login Page)。
