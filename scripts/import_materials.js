
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const FIXED_UNITS = ["支", "把", "個", "雙", "台", "條", "片", "捲", "瓶"];

async function importMaterials() {
    const csvContent = fs.readFileSync(path.resolve(process.cwd(), 'materials_data.csv'), 'utf-8');
    const lines = csvContent.split('\n');

    let currentScheme = "";
    const materialsMap = new Map(); // name -> id
    const recipes = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('壁癌等級') || line.startsWith('等級')) continue;

        const cols = line.split(',');
        // Handle quoted fields logic if needed, but this CSV looks simple.
        // If cols[0] has content, it's a new scheme (or same scheme if implied, but usually blank means same).
        if (cols[0] && cols[0].trim()) {
            currentScheme = cols[0].trim().replace('\r', '');
            console.log(`Processing Scheme: ${currentScheme}`);
            // Ensure Method Exists
            const { data: methods } = await supabase.from('methods').select('id').eq('name', currentScheme);
            if (!methods || methods.length === 0) {
                // Create Method
                console.log(`Creating Method: ${currentScheme}`);
                // We'll give it a generic Category 'WALL_CANCER' for now
                await supabase.from('methods').insert({
                    id: `M-${randomUUID().substring(0, 8)}`,
                    name: currentScheme,
                    category: '一般壁癌修繕',
                    defaultUnit: '坪',
                    description: 'Imported from CSV'
                });
            }
        }

        const name = cols[1]?.trim();
        if (!name) continue;

        // Material Data
        const brand = cols[2]?.trim() || '';
        const unit = cols[3]?.trim() || '';
        const price = parseFloat(cols[4] || '0');
        const costPerVal = parseFloat(cols[5] || '0');
        const qty = parseFloat(cols[6] || '0');
        const note = cols[7]?.trim() || '';
        const finalCostPing = parseFloat(cols[8] || '0');

        // Determine Fixed vs Variable
        // Logic: If Unit in FIXED_UNITS -> Fixed. Else Variable.
        // Also "人事費用" -> Variable.
        let category = 'variable';
        if (FIXED_UNITS.some(u => unit.includes(u))) {
            category = 'fixed';
        }
        if (unit.includes('桶') || unit.includes('包') || unit.includes('袋') || unit.includes('公升')) {
            category = 'variable';
        }
        if (name.includes('人事')) category = 'variable';

        // 1. Upsert Material
        let materialId = materialsMap.get(name);
        if (!materialId) {
            // Check if exists in DB to avoid dupes across runs (though here we just map in memory for this run)
            // We'll generate a consistent ID based on name? No, UUID is safer.
            materialId = `MAT-${randomUUID().substring(0, 8)}`,
                materialsMap.set(name, materialId);

            // We should check DB if name exists
            const { data: existing } = await supabase.from('materials').select('id').eq('name', name).maybeSingle();
            if (existing) {
                materialId = existing.id;
                materialsMap.set(name, materialId);
            } else {
                await supabase.from('materials').insert({
                    id: materialId,
                    name,
                    brand,
                    unit,
                    unitPrice: price,
                    costPerVal
                });
                console.log(`Created Material: ${name}`);
            }
        }

        // 2. Create Recipe
        // Get Method ID
        const { data: methodData } = await supabase.from('methods').select('id').eq('name', currentScheme).single();
        if (methodData) {
            // Calculate Consumption Rate
            // For Fixed: Rate = 0 (just use base qty)
            // For Variable: Rate = FinalCostPing / UnitPrice (if price > 0)
            let rate = 0;
            if (category === 'variable' && price > 0) {
                rate = finalCostPing / price;
            }

            // Override for specific logic if needed?
            // e.g. Paint 18L, cost 4095, final 328 => 0.08 buckets/ping.

            recipes.push({
                id: `REC-${randomUUID()}`,
                methodId: methodData.id,
                materialId,
                quantity: qty, // Base Quantity (e.g. 2 brushes)
                category,
                consumptionRate: rate,
                note
            });
        }
    }

    // Batch insert recipes
    if (recipes.length > 0) {
        // Clear existing recipes for these methods to avoid dupes?
        // For now, just insert.
        const { error } = await supabase.from('method_recipes').insert(recipes);
        if (error) console.error('Error inserting recipes:', error);
        else console.log(`Inserted ${recipes.length} recipes.`);
    }
}

importMaterials();
