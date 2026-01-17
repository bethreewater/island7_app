
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const CSV_PATH = path.join(__dirname, '../wall_cancer_data.csv');

async function importData() {
    console.log('Reading CSV...');
    const rawData = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = rawData.split('\n').filter(l => l.trim() !== '');

    const methodsMap = new Map();

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length < 5) continue;

        const methodName = cols[0];
        const matName = cols[1];
        const brand = cols[2] === '無' ? '' : cols[2];
        const unit = cols[3];
        const price = parseFloat(cols[4]) || 0;
        const qty = parseFloat(cols[6]) || 0;
        const note = cols[7];

        if (!methodsMap.has(methodName)) {
            methodsMap.set(methodName, []);
        }
        methodsMap.get(methodName).push({
            matName, brand, unit, price, qty, note
        });
    }

    console.log('Upserting materials...');
    const materialIds = new Map();
    const allMaterials = new Map();
    for (const [_, items] of methodsMap) {
        for (const item of items) {
            if (!allMaterials.has(item.matName)) {
                allMaterials.set(item.matName, item);
            }
        }
    }

    for (const [name, info] of allMaterials) {
        const { data: existing } = await supabase.from('materials').select('id').eq('name', name).maybeSingle();
        let id;
        if (existing) {
            id = existing.id;
            await supabase.from('materials').update({
                brand: info.brand,
                unit: info.unit,
                unitPrice: info.price,
                updatedAt: new Date().toISOString()
            }).eq('id', id);
        } else {
            id = `MAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const { error: matErr } = await supabase.from('materials').insert({
                id,
                name,
                brand: info.brand,
                unit: info.unit,
                unitPrice: info.price,
                updatedAt: new Date().toISOString()
            });
            if (matErr) console.error('Error inserting material:', matErr);
        }
        materialIds.set(name, id);
    }

    console.log('Processing Methods...');
    for (const [methodName, items] of methodsMap) {
        console.log(`Processing Scheme: ${methodName}`);

        let methodId;
        const { data: existingMethod } = await supabase.from('methods').select('*').eq('name', methodName).maybeSingle();

        if (existingMethod) {
            methodId = existingMethod.id;
            console.log(`  Found existing method: ${methodId}`);
            // Force update category just in case
            await supabase.from('methods').update({ category: '一般壁癌修繕' }).eq('id', methodId);
        } else {
            methodId = `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const enMap = {
                '基礎方案': 'Basic Scheme',
                '透氣方案': 'Breathable Scheme',
                '阿娘威修護方案': 'OMG Repair Scheme',
                '質感灰泥方案': 'Texture Plaster',
                '尊爵修護方案': 'Prestige Repair'
            };

            const { error: methodError } = await supabase.from('methods').insert({
                id: methodId,
                name: methodName,
                englishName: enMap[methodName] || 'Custom Scheme',
                category: '一般壁癌修繕',
                defaultUnit: '坪',
                defaultUnitPrice: 0,
                estimatedDays: 3,
                steps: []
            });

            if (methodError) {
                console.error('Error creating method:', methodError);
                continue; // Skip recipes if method fails
            } else {
                console.log(`  Created new method: ${methodId}`);
            }
        }

        const { error: delErr } = await supabase.from('method_recipes').delete().eq('methodId', methodId);
        if (delErr) console.error('Error clearing recipes:', delErr);

        for (const item of items) {
            const matId = materialIds.get(item.matName);
            let category = 'fixed';
            const variableKeywords = ['乳膠漆', '底漆', '補土', '防水', '灰漿', '灰泥', '礦物漆', '人事費用'];
            if (variableKeywords.some(k => item.matName.includes(k))) category = 'variable';
            if (item.unit.toLowerCase().includes('l') || item.unit.toLowerCase().includes('kg')) category = 'variable';
            if (item.unit.includes('坪')) category = 'variable';
            const fixedUnits = ['支', '把', '個', '捲', '條', '瓶', '片'];
            if (fixedUnits.some(u => item.unit.includes(u))) category = 'fixed';

            const recipeId = `REC-${randomUUID()}`;
            const { error: recErr } = await supabase.from('method_recipes').insert({
                id: recipeId,
                methodId,
                materialId: matId,
                quantity: category === 'fixed' ? item.qty : 0,
                consumptionRate: category === 'variable' ? (item.qty ? Number((1 / item.qty).toFixed(4)) : 0) : 0,
                category
            });
            if (recErr) console.error('Error inserting recipe:', recErr);
        }
    }
    console.log('Done!');
}

importData().catch(console.error);
