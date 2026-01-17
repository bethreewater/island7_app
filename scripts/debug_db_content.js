
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking Wall Cancer Methods...');
    const { data: methods, error: err1 } = await supabase.from('methods').select('id, name, category').eq('category', '一般壁癌修繕');
    if (err1) console.error('Method Fetch Error:', err1);
    console.log(`Wall Cancer Methods found: ${methods?.length}`);
    if (methods) {
        for (const m of methods) {
            const { data: recipes, error: err2 } = await supabase.from('method_recipes').select('id, materialId').eq('methodId', m.id);
            console.log(`Method: ${m.name} (${m.id}) - Recipes: ${recipes?.length}`);
        }
    }
}

check();
