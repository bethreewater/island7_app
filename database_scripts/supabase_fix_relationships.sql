
-- 修復關聯性腳本：建立 Foreign Keys
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 1. 建立配方與材料的關聯 (讓系統知道 materialId 對應 materials 表格)
ALTER TABLE method_recipes
ADD CONSTRAINT fk_method_recipes_materials
FOREIGN KEY ("materialId") REFERENCES materials("id")
ON DELETE CASCADE;

-- 2. 建立配方與方案的關聯
ALTER TABLE method_recipes
ADD CONSTRAINT fk_method_recipes_methods
FOREIGN KEY ("methodId") REFERENCES methods("id")
ON DELETE CASCADE;

-- 執行成功後，前端才能正確讀取「材料詳情」
