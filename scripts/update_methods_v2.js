
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Enum values from types.ts
const ServiceCategory = {
    WALL_CANCER: '一般壁癌修繕',
    WALL_WATERPROOF: '外牆防水',
    ROOF_WATERPROOF: '頂樓防水',
    CRACK: '內外牆裂縫處理',
    STRUCTURE: '嚴重鋼筋外露壁癌',
    SILICONE_BATH: '浴室防水矽利康',
    SILICONE_WINDOW: '門窗防水矽利康',
    CUSTOM: '其他自定義工程'
};

const METHODS = [
    // --- 壁癌修繕 (WALL_CANCER) ---
    {
        id: 'WC-01',
        category: ServiceCategory.WALL_CANCER,
        name: '基礎方案',
        englishName: 'Basic Cover',
        defaultUnit: '坪',
        defaultUnitPrice: 6390,
        estimatedDays: 6,
        steps: [
            { name: '刮除與清除', description: '刮除粉化層並消毒滅菌', prepMinutes: 3, execMinutes: 30 },
            { name: '局部修補', description: '使用批土填平凹洞', prepMinutes: 5, execMinutes: 5 }, // Note: User text says simply "底漆", but steps details explain patch first? Wait, checking text. Day 1: Scrape, Day 2: Primer? Text Table says: Day 1 Scrape, Day 2 Primer...
            // Let's follow the "施作步驟程序" table in text for accuracy.
            // Table: Day1: 刮除(33m), Day2: 底漆(10m), Day3: 補土(31m), Day4: 補土(31m), Day5: 乳膠漆(10m) -> Total 5 days? Text says "天數 Day5".
            // Implementation:
            { name: '刮除與清除', description: '去處凸起、消毒滅菌 (靜置24hr)', prepMinutes: 3, execMinutes: 30 },
            { name: '上底漆', description: '基底封固', prepMinutes: 5, execMinutes: 5 },
            { name: '局部修補(1)', description: '填平凹洞 (第一次)', prepMinutes: 1, execMinutes: 30 },
            { name: '局部修補(2)', description: '填平凹洞 (第二次)', prepMinutes: 1, execMinutes: 30 },
            { name: '上面漆', description: '美觀保護', prepMinutes: 5, execMinutes: 5 }
        ]
    },
    {
        id: 'WC-02',
        category: ServiceCategory.WALL_CANCER,
        name: '透氣方案',
        englishName: 'Breathable Scheme',
        defaultUnit: '坪',
        defaultUnitPrice: 19180,
        estimatedDays: 13,
        steps: [
            { name: '刮除與清除', description: '刮除並消毒', prepMinutes: 3, execMinutes: 30 },
            { name: '滲透防水結晶IC(1)', description: '第一道IC塗抹', prepMinutes: 10, execMinutes: 20 },
            { name: '滲透防水結晶IC(2)', description: '第二道IC塗抹', prepMinutes: 10, execMinutes: 20 },
            { name: '滲透防水結晶IC(3)', description: '第三道IC塗抹', prepMinutes: 10, execMinutes: 20 },
            { name: 'IC養護(1)', description: '噴水養護', prepMinutes: 5, execMinutes: 3 },
            { name: 'IC養護(2)', description: '噴水養護', prepMinutes: 5, execMinutes: 3 },
            { name: 'IC養護(3)', description: '噴水養護', prepMinutes: 5, execMinutes: 3 },
            { name: '透氣底漆(1)', description: '基底透氣處理', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣補土(1)', description: '牆面找平', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣補土(2)', description: '牆面找平', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣底漆(2)', description: '增加附著度', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣乳膠漆(1)', description: '美觀保護', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣乳膠漆(2)', description: '美觀保護', prepMinutes: 5, execMinutes: 5 },
            { name: '收尾', description: '完工清理', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'WC-03',
        category: ServiceCategory.WALL_CANCER,
        name: '阿娘威方案',
        englishName: 'Structural Repair',
        defaultUnit: '坪',
        defaultUnitPrice: 32560,
        estimatedDays: 15,
        steps: [
            { name: '刮除與清除', description: '', prepMinutes: 3, execMinutes: 30 },
            { name: '滲透防水IC(1)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '滲透防水IC(2)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '滲透防水IC(3)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: 'IC養護期', description: '三天養護', prepMinutes: 15, execMinutes: 9 }, // Summary of 3 days
            { name: '結構灰漿(1)', description: '馬貝高強度修補', prepMinutes: 5, execMinutes: 30 },
            { name: '結構灰漿(2)', description: '馬貝高強度修補', prepMinutes: 5, execMinutes: 30 },
            { name: '透氣底漆(1)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣補土(1)', description: '', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣補土(2)', description: '', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣底漆(2)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣乳膠漆(1)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣乳膠漆(2)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'WC-04',
        category: ServiceCategory.WALL_CANCER,
        name: '質感灰泥方案',
        englishName: 'Artistic Plaster',
        defaultUnit: '坪',
        defaultUnitPrice: 33380,
        estimatedDays: 13,
        steps: [
            { name: '刮除與清除', description: '', prepMinutes: 3, execMinutes: 30 },
            { name: '滲透防水IC(總成)', description: '含塗抹與養護', prepMinutes: 45, execMinutes: 100 },
            { name: '透氣底漆', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '透氣補土(1)', description: '', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣補土(2)', description: '', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣底漆', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '樂土灰泥(1)', description: '藝術牆面施作', prepMinutes: 10, execMinutes: 30 },
            { name: '樂土灰泥(2)', description: '藝術牆面施作', prepMinutes: 10, execMinutes: 30 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'WC-05',
        category: ServiceCategory.WALL_CANCER,
        name: '尊爵修護方案',
        englishName: 'Premium Mineral',
        defaultUnit: '坪',
        defaultUnitPrice: 39730,
        estimatedDays: 18,
        steps: [
            { name: '前置處理總成', description: '刮除、IC防水、養護', prepMinutes: 50, execMinutes: 130 },
            { name: '底層找平總成', description: '底漆、補土x2、底漆', prepMinutes: 12, execMinutes: 70 },
            { name: '樂土灰泥(1)', description: '', prepMinutes: 10, execMinutes: 30 },
            { name: '樂土灰泥(2)', description: '', prepMinutes: 10, execMinutes: 30 },
            { name: '灰泥通風養護', description: '三天靜置', prepMinutes: 0, execMinutes: 0 },
            { name: '礦物漆(1)', description: '凱恩礦物漆', prepMinutes: 5, execMinutes: 30 },
            { name: '礦物漆(2)', description: '凱恩礦物漆', prepMinutes: 5, execMinutes: 30 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },

    // --- 外牆防水 (WALL_WATERPROOF) ---
    {
        id: 'WP-01',
        category: ServiceCategory.WALL_WATERPROOF,
        name: '基本方案',
        englishName: 'Basic Waterproof',
        defaultUnit: '坪',
        defaultUnitPrice: 5655,
        estimatedDays: 5,
        steps: [
            { name: '基面清潔檢查', description: '鋼刷水槍清除', prepMinutes: 0, execMinutes: 10 },
            { name: '刻槽處理', description: '裂縫擴大', prepMinutes: 10, execMinutes: 5 },
            { name: '裂縫補強', description: 'Sika 11FC', prepMinutes: 10, execMinutes: 5 },
            { name: '防水底膠', description: '得利防水底膠', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(1)', description: '防水面漆第一道', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '防水面漆第二道', prepMinutes: 0, execMinutes: 10 },
            { name: '收尾', description: '養護驗收', prepMinutes: 0, execMinutes: 40 }
        ]
    },
    {
        id: 'WP-02',
        category: ServiceCategory.WALL_WATERPROOF,
        name: '標準方案',
        englishName: 'Standard Waterproof',
        defaultUnit: '坪',
        defaultUnitPrice: 7930,
        estimatedDays: 6,
        steps: [
            { name: '前置處理', description: '清潔、刻槽、補強', prepMinutes: 20, execMinutes: 20 },
            { name: '防水底膠', description: '得利防水底膠', prepMinutes: 10, execMinutes: 10 },
            { name: '彈性防水塗料', description: '高彈性外牆防水塗料', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(1)', description: '防水面漆第一道', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '防水面漆第二道', prepMinutes: 0, execMinutes: 10 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 50 }
        ]
    },
    {
        id: 'WP-03',
        category: ServiceCategory.WALL_WATERPROOF,
        name: '加強方案',
        englishName: 'Enhanced Waterproof',
        defaultUnit: '坪',
        defaultUnitPrice: 10355,
        estimatedDays: 7,
        steps: [
            { name: '前置處理', description: '清潔、刻槽、補強', prepMinutes: 20, execMinutes: 20 },
            { name: '防水底膠', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: '彈性防水(1)', description: '第一道', prepMinutes: 10, execMinutes: 10 },
            { name: '彈性防水(2)', description: '第二道(交叉)', prepMinutes: 10, execMinutes: 5 },
            { name: '強力底漆', description: '得利強力底漆', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(1)', description: '', prepMinutes: 10, execMinutes: 5 }, // Note: User text implies 2 coats of top paint
            { name: '防水漆(2)', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 60 }
        ]
    },
    {
        id: 'WP-04',
        category: ServiceCategory.WALL_WATERPROOF,
        name: '頂級方案',
        englishName: 'Premium Waterproof',
        defaultUnit: '坪',
        defaultUnitPrice: 19355,
        estimatedDays: 8,
        steps: [
            { name: '前置處理', description: '清潔、刻槽、補強', prepMinutes: 20, execMinutes: 20 },
            { name: '矽酸質底膠', description: '立邦全新2代', prepMinutes: 10, execMinutes: 10 },
            { name: '107防水材', description: 'SIKA 107', prepMinutes: 10, execMinutes: 20 },
            { name: '彈性防水', description: '高彈性外牆防水塗料', prepMinutes: 10, execMinutes: 20 },
            { name: '強力底漆', description: '得利強力底漆', prepMinutes: 10, execMinutes: 10 },
            { name: '防水漆(1)', description: '', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '', prepMinutes: 0, execMinutes: 5 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },

    // --- 頂樓防水 (ROOF_WATERPROOF) ---
    {
        id: 'RF-01',
        category: ServiceCategory.ROOF_WATERPROOF,
        name: '基本方案',
        englishName: 'Basic Roof',
        defaultUnit: '坪',
        defaultUnitPrice: 7405,
        estimatedDays: 6,
        steps: [
            { name: '基面清潔', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '裂縫處理', description: '刻槽與補強', prepMinutes: 20, execMinutes: 10 },
            { name: '防水底膠', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: 'PU防水層', description: '龍師傅PU', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(1)', description: '', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '收尾', description: '養護驗收', prepMinutes: 0, execMinutes: 50 }
        ]
    },
    {
        id: 'RF-02',
        category: ServiceCategory.ROOF_WATERPROOF,
        name: '標準方案',
        englishName: 'Standard Roof',
        defaultUnit: '坪',
        defaultUnitPrice: 9155,
        estimatedDays: 7,
        steps: [
            { name: '基面清潔', description: '', prepMinutes: 3, execMinutes: 30 },
            { name: '裂縫補強', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '防水底膠', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: 'PU防水層(1)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: 'PU防水層(2)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '防水漆(1)', description: '', prepMinutes: 5, execMinutes: 10 },
            { name: '防水漆(2)', description: '', prepMinutes: 5, execMinutes: 10 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'RF-03',
        category: ServiceCategory.ROOF_WATERPROOF,
        name: '加強方案',
        englishName: 'Enhanced Roof',
        defaultUnit: '坪',
        defaultUnitPrice: 10305,
        estimatedDays: 8,
        steps: [
            { name: '前置處理', description: '', prepMinutes: 13, execMinutes: 50 },
            { name: '防水底膠', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: '艾克師PU(1)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '艾克師PU(2)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '強力底漆', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: '防水漆(1)', description: '', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '', prepMinutes: 0, execMinutes: 5 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'RF-04',
        category: ServiceCategory.ROOF_WATERPROOF,
        name: '頂級方案',
        englishName: 'Premium Roof',
        defaultUnit: '坪',
        defaultUnitPrice: 15155,
        estimatedDays: 9,
        steps: [
            { name: '前置處理', description: '含清潔補強', prepMinutes: 13, execMinutes: 50 },
            { name: 'SIKA 107', description: '防水砂漿', prepMinutes: 10, execMinutes: 20 },
            { name: '防水底膠', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: '艾克師PU(1)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '艾克師PU(2)', description: '', prepMinutes: 10, execMinutes: 20 },
            { name: '強力底漆', description: '', prepMinutes: 10, execMinutes: 10 },
            { name: '防水漆(1)', description: '', prepMinutes: 10, execMinutes: 5 },
            { name: '防水漆(2)', description: '', prepMinutes: 0, execMinutes: 5 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },

    // --- 裂縫處理 (CRACK) ---
    {
        id: 'CR-01',
        category: ServiceCategory.CRACK,
        name: '表裂方案',
        englishName: 'Surface Crack',
        defaultUnit: '公尺',
        defaultUnitPrice: 443,
        estimatedDays: 1,
        steps: [
            { name: '補土填補', description: '恐龍細質批土', prepMinutes: 5, execMinutes: 15 },
            { name: '砂紙磨平', description: '表面光滑處理', prepMinutes: 2, execMinutes: 10 }
        ]
    },
    {
        id: 'CR-02',
        category: ServiceCategory.CRACK,
        name: '伸縮裂方案',
        englishName: 'Expansion Crack',
        defaultUnit: '公尺',
        defaultUnitPrice: 513,
        estimatedDays: 1,
        steps: [
            { name: '檢查清潔', description: '刻槽與清潔', prepMinutes: 5, execMinutes: 15 },
            { name: '填補裂縫', description: 'SIKA 11FC', prepMinutes: 5, execMinutes: 20 }
        ]
    },
    {
        id: 'CR-03',
        category: ServiceCategory.CRACK,
        name: '結構裂方案',
        englishName: 'Structural Crack',
        defaultUnit: '公尺',
        defaultUnitPrice: 798,
        estimatedDays: 1,
        steps: [
            { name: '檢查清潔', description: '', prepMinutes: 5, execMinutes: 15 },
            { name: '填補裂縫', description: 'SIKA 109', prepMinutes: 10, execMinutes: 30 }
        ]
    },

    // --- 結構修繕 (STRUCTURE) ---
    {
        id: 'ST-01',
        category: ServiceCategory.STRUCTURE,
        name: '快速修飾方案',
        englishName: 'Quick Fix',
        defaultUnit: '坪',
        defaultUnitPrice: 14890,
        estimatedDays: 10,
        steps: [
            { name: '結構清理', description: '除鏽與消毒', prepMinutes: 3, execMinutes: 40 },
            { name: '鋼筋防鏽(1)', description: 'MAPEFER 1K 第一層', prepMinutes: 10, execMinutes: 20 },
            { name: '鋼筋防鏽(2)', description: 'MAPEFER 1K 第二層', prepMinutes: 10, execMinutes: 20 },
            { name: '結構修補(1)', description: '益膠泥', prepMinutes: 10, execMinutes: 30 },
            { name: '結構修補(2)', description: '益膠泥', prepMinutes: 10, execMinutes: 30 },
            { name: '補土(1)', description: '歡喜批土', prepMinutes: 1, execMinutes: 30 },
            { name: '補土(2)', description: '歡喜批土', prepMinutes: 1, execMinutes: 30 },
            { name: '上底漆', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '乳膠漆(1)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '乳膠漆(2)', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'ST-02',
        category: ServiceCategory.STRUCTURE,
        name: '穩定維持方案',
        englishName: 'Stable Maintenance',
        defaultUnit: '坪',
        defaultUnitPrice: 24340,
        estimatedDays: 10,
        steps: [
            { name: '結構清理除鏽', description: '', prepMinutes: 3, execMinutes: 40 },
            { name: '鋼筋防鏽', description: 'MAPEFER 1K', prepMinutes: 20, execMinutes: 40 },
            { name: '防水底膠', description: '立邦2代矽酸質', prepMinutes: 5, execMinutes: 10 },
            { name: '結構修補(1)', description: '馬貝灰漿', prepMinutes: 10, execMinutes: 30 },
            { name: '結構修補(2)', description: '馬貝灰漿', prepMinutes: 10, execMinutes: 30 },
            { name: '透氣補土', description: '凱恩透氣補土', prepMinutes: 1, execMinutes: 30 },
            { name: '底漆與面漆', description: '凱恩底漆+立邦乳膠漆', prepMinutes: 15, execMinutes: 20 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'ST-03',
        category: ServiceCategory.STRUCTURE,
        name: '核心根治方案',
        englishName: 'Core Cure',
        defaultUnit: '坪',
        defaultUnitPrice: 34260,
        estimatedDays: 15,
        steps: [
            { name: '前置除鏽', description: '', prepMinutes: 33, execMinutes: 80 }, // Combined scrape and rust proof
            { name: 'IC防水(總成)', description: '三層IC+養護', prepMinutes: 55, execMinutes: 99 },
            { name: '結構復原(1)', description: '馬貝灰漿', prepMinutes: 5, execMinutes: 30 },
            { name: '結構復原(2)', description: '馬貝灰漿', prepMinutes: 5, execMinutes: 30 },
            { name: '表面找平', description: '凱恩透氣補土', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣塗裝總成', description: '底漆+面漆x2', prepMinutes: 15, execMinutes: 15 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },
    {
        id: 'ST-04',
        category: ServiceCategory.STRUCTURE,
        name: '全效保障方案',
        englishName: 'Total Protection',
        defaultUnit: '坪',
        defaultUnitPrice: 35760,
        estimatedDays: 16,
        steps: [
            { name: '前置除鏽', description: '', prepMinutes: 33, execMinutes: 80 },
            { name: 'IC防水(總成)', description: '三層IC+養護', prepMinutes: 55, execMinutes: 99 },
            { name: '結構復原(總成)', description: '馬貝灰漿x2', prepMinutes: 10, execMinutes: 60 },
            { name: '凱恩底漆', description: '', prepMinutes: 5, execMinutes: 5 },
            { name: '表面找平', description: '', prepMinutes: 1, execMinutes: 30 },
            { name: '透氣塗裝總成', description: '底漆+面漆x2', prepMinutes: 15, execMinutes: 15 },
            { name: '收尾', description: '', prepMinutes: 0, execMinutes: 10 }
        ]
    },

    // --- 矽利康 (SILICONE) ---
    // Bath
    {
        id: 'SL-B1',
        category: ServiceCategory.SILICONE_BATH,
        name: '容易施作方案',
        englishName: 'Bath Easy',
        defaultUnit: '式', // Changed from Meter to '式' or keep Meter but price implies high base? The user says "施打定價方式(公尺)". Let's stick to Meter but the price is 1960. Maybe it's per job? But it says (公尺). I'll trust the input.
        defaultUnitPrice: 1960,
        estimatedDays: 1,
        steps: [
            { name: '刮除清洁', description: '除膠與去油', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '保護膠帶', prepMinutes: 0, execMinutes: 10 },
            { name: '施打防水條', description: 'Super Fix', prepMinutes: 0, execMinutes: 15 }
        ]
    },
    {
        id: 'SL-B2',
        category: ServiceCategory.SILICONE_BATH,
        name: '中等施作方案',
        englishName: 'Bath Medium',
        defaultUnit: '式',
        defaultUnitPrice: 2360,
        estimatedDays: 1,
        steps: [
            { name: '刮除清潔', description: '', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '施打防水條', description: 'Super Fix (角度受限)', prepMinutes: 0, execMinutes: 20 }
        ]
    },
    {
        id: 'SL-B3',
        category: ServiceCategory.SILICONE_BATH,
        name: '困難施作方案',
        englishName: 'Bath Hard',
        defaultUnit: '式',
        defaultUnitPrice: 2760,
        estimatedDays: 1,
        steps: [
            { name: '刮除清潔', description: '', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '施打防水條', description: 'Super Fix (狹小空間)', prepMinutes: 0, execMinutes: 30 }
        ]
    },
    // Window
    {
        id: 'SL-W1',
        category: ServiceCategory.SILICONE_WINDOW,
        name: '容易施作方案',
        englishName: 'Window Easy',
        defaultUnit: '公尺',
        defaultUnitPrice: 147,
        estimatedDays: 1,
        steps: [
            { name: '刮除清潔', description: '', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '施打SIKA', description: 'Sika Sikasil-701', prepMinutes: 0, execMinutes: 15 }
        ]
    },
    {
        id: 'SL-W2',
        category: ServiceCategory.SILICONE_WINDOW,
        name: '中等施作方案',
        englishName: 'Window Medium',
        defaultUnit: '公尺',
        defaultUnitPrice: 247,
        estimatedDays: 1,
        steps: [
            { name: '刮除清潔', description: '', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '施打SIKA', description: 'Sika Sikasil-701 (角度受限)', prepMinutes: 0, execMinutes: 20 }
        ]
    },
    {
        id: 'SL-W3',
        category: ServiceCategory.SILICONE_WINDOW,
        name: '困難施作方案',
        englishName: 'Window Hard',
        defaultUnit: '公尺',
        defaultUnitPrice: 347,
        estimatedDays: 1,
        steps: [
            { name: '刮除清潔', description: '', prepMinutes: 5, execMinutes: 20 },
            { name: '貼膠帶', description: '', prepMinutes: 0, execMinutes: 10 },
            { name: '施打SIKA', description: 'Sika Sikasil-701 (手指塗抹)', prepMinutes: 0, execMinutes: 30 }
        ]
    }
];

async function updateMethods() {
    console.log('Starting Method Catalog Update...');

    for (const method of METHODS) {
        const { data, error } = await supabase
            .from('methods')
            .upsert(method, { onConflict: 'id' })
            .select();

        if (error) {
            console.error(`Error updating ${method.name}:`, error);
        } else {
            console.log(`Updated: ${method.name} (${method.id})`);
        }
    }

    console.log('Update Complete.');
}

updateMethods();
