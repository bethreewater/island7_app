-- Migration: Add warranty columns to methods table
-- 執行位置：Supabase Dashboard → SQL Editor
-- 說明：為 methods 表格新增保固設定欄位

ALTER TABLE methods ADD COLUMN IF NOT EXISTS "warrantyType" text DEFAULT 'leak_handled';
ALTER TABLE methods ADD COLUMN IF NOT EXISTS "warrantyMonths" numeric DEFAULT 12;
ALTER TABLE methods ADD COLUMN IF NOT EXISTS "warrantyVisits" numeric DEFAULT 1;
