
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('Checking for Duplicate Methods...');
    const { data: methods } = await supabase.from('methods').select('id, name, englishName').eq('name', '基礎方案');

    if (methods) {
        console.log('Found methods with name 基礎方案:');
        for (const m of methods) {
            const { count } = await supabase.from('method_recipes').select('*', { count: 'exact', head: true }).eq('methodId', m.id);
            console.log(`- ID: ${m.id}, Rec count: ${count}`);
        }
    }
}

check();
