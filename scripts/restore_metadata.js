
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const METADATA_MAP = {
    '基礎方案': {
        defaultUnitPrice: 6390,
        estimatedDays: 6,
        steps: [
            { name: '壁癌刮除 / SCRAPE', description: '確實刮除粉化層', prepMinutes: 3, execMinutes: 30 },
            { name: '消毒處理 / DISINFECT', description: '1:10 消毒噴灑', prepMinutes: 5, execMinutes: 33 },
            { name: '靜置乾燥 / DRY', description: '24小時殺菌期', prepMinutes: 1440, execMinutes: 0 },
            { name: '補土工程 / PATCH', description: '找平凹洞', prepMinutes: 480, execMinutes: 30 },
            { name: '面漆工程 / PAINT', description: '完工美化', prepMinutes: 120, execMinutes: 5 }
        ]
    },
    '透氣方案': {
        defaultUnitPrice: 8800,
        estimatedDays: 7,
        steps: [
            { name: '深層清刷 / SCRUB', description: '深層清除黴菌孢子', prepMinutes: 10, execMinutes: 45 },
            { name: '抗鹼封閉 / SEAL', description: '底漆封閉鹼性物質', prepMinutes: 15, execMinutes: 20 },
            { name: '滲透防水 / PERM', description: '高效滲透型防水材', prepMinutes: 10, execMinutes: 30 },
            { name: '抗霉中塗 / COAT', description: '增強防霉層', prepMinutes: 30, execMinutes: 40 },
            { name: '乳膠漆 / LATEX', description: '高品質面漆', prepMinutes: 60, execMinutes: 20 }
        ]
    },
    '阿娘威修護方案': {
        defaultUnitPrice: 12500,
        estimatedDays: 10,
        steps: [
            { name: '打除見底 / DEMOLISH', description: '打除至結構層', prepMinutes: 20, execMinutes: 120 },
            { name: '結構修復 / STRUCT', description: '樹脂砂漿修補', prepMinutes: 30, execMinutes: 60 },
            { name: '負壓防水 / NEG-W', description: '負壓專用防水', prepMinutes: 40, execMinutes: 80 },
            { name: '粗底抹灰 / PLASTER', description: '水泥粗底復原', prepMinutes: 60, execMinutes: 90 },
            { name: '粉光處理 / FINISH', description: '細部找平粉光', prepMinutes: 120, execMinutes: 60 }
        ]
    },
    '質感灰泥方案': {
        defaultUnitPrice: 9500,
        estimatedDays: 5,
        steps: [
            { name: '基層處理 / BASE', description: '表面清潔與介面漆', prepMinutes: 30, execMinutes: 60 },
            { name: '灰泥打底 / COAT-1', description: '第一道灰泥鏝抹', prepMinutes: 30, execMinutes: 90 },
            { name: '紋理製作 / TEXTURE', description: '第二道灰泥紋理', prepMinutes: 20, execMinutes: 120 },
            { name: '防護面漆 / SEALER', description: '表面防護處理', prepMinutes: 15, execMinutes: 45 }
        ]
    },
    '尊爵修護方案': {
        defaultUnitPrice: 15000,
        estimatedDays: 8,
        steps: [
            { name: '壁癌深層處理 / DEEP', description: '深層打磨與清潔', prepMinutes: 60, execMinutes: 120 },
            { name: '結構補強 / REINFORCE', description: '纖維網與結構膠', prepMinutes: 30, execMinutes: 90 },
            { name: '防水底塗 / PRIMER', description: '高效能防水底塗', prepMinutes: 20, execMinutes: 60 },
            { name: '功能性中塗 / MID', description: '彈性、隔熱中塗', prepMinutes: 30, execMinutes: 80 },
            { name: '頂級面漆 / TOP', description: '耐候抗污面漆', prepMinutes: 30, execMinutes: 60 }
        ]
    }
};

async function updateMetadata() {
    console.log('Restoring method steps and pricing...');

    for (const [name, meta] of Object.entries(METADATA_MAP)) {
        const { error } = await supabase
            .from('methods')
            .update({
                defaultUnitPrice: meta.defaultUnitPrice,
                estimatedDays: meta.estimatedDays,
                steps: meta.steps
            })
            .eq('name', name);

        if (error) {
            console.error(`Error updating ${name}:`, error);
        } else {
            console.log(`Updated metadata for ${name}`);
        }
    }
}

updateMetadata();
