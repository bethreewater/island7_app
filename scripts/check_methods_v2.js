
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMethods() {
    const { data, error } = await supabase.from('methods').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log('Methods found:', data.length);
        data.forEach(m => console.log(`- [${m.category}] ${m.name} (${m.id})`));
    }
}

checkMethods();
