
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('Testing Frontend Query implementation...');

    // Frontend code: select('*, material:materials(*)')
    const { data, error } = await supabase
        .from('method_recipes')
        .select('*, material:materials(*)'); // alias material, table materials

    if (error) {
        console.error('Query Failed:', error);
    } else {
        console.log(`Query Success. Rows: ${data?.length}`);
        if (data && data.length > 0) {
            console.log('Sample Row:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('Query returned 0 rows (RLS? Empty?)');
            // Cross check count without join
            const { count } = await supabase.from('method_recipes').select('*', { count: 'exact', head: true });
            console.log('Actual rows in table:', count);
        }
    }
}

check();
