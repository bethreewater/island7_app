
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
    console.log('Fixing categories...');

    // Update 'wall_cancer' -> '一般壁癌修繕'
    const { error } = await supabase
        .from('methods')
        .update({ category: '一般壁癌修繕' })
        .eq('category', 'wall_cancer');

    if (error) console.error(error);
    else console.log('Successfully updated categories!');
}

fix();
