import { createClient } from '@supabase/supabase-js'

// 1. 嘗試讀取金鑰
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. Debug 檢查站：如果讀不到，馬上跳視窗警告，不要讓程式當機
if (!supabaseUrl || !supabaseKey) {
    alert('❌ 嚴重錯誤：讀不到 .env 金鑰！\n請確認 .env 檔案位置是否正確 (要在最外層)，\n並且有重啟伺服器。');
    throw new Error('Supabase keys missing'); // 故意停止程式，避免轉圈圈
}

// 3. 如果成功，在控制台印出來 (你可以按 F12 看到)
console.log('✅ Supabase 連線成功，網址為:', supabaseUrl);

// 4. 建立連線
export const supabase = createClient(supabaseUrl, supabaseKey)