
-- 資料庫清理與修復腳本
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本

-- 1. 清理「孤兒」資料 (刪除那些對應不到有效方案或材料的配方)
DELETE FROM method_recipes
WHERE "methodId" NOT IN (SELECT "id" FROM methods);

DELETE FROM method_recipes
WHERE "materialId" NOT IN (SELECT "id" FROM materials);

-- 2. 建立關聯性 (Foreign Keys)
-- 這能確保未來資料的一致性，並讓前端能正確抓取關聯資料

-- 建立配方與材料的關聯
ALTER TABLE method_recipes
ADD CONSTRAINT fk_method_recipes_materials
FOREIGN KEY ("materialId") REFERENCES materials("id")
ON DELETE CASCADE;

-- 建立配方與方案的關聯
ALTER TABLE method_recipes
ADD CONSTRAINT fk_method_recipes_methods
FOREIGN KEY ("methodId") REFERENCES methods("id")
ON DELETE CASCADE;
