
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function reset() {
    console.log('Resetting Wall Cancer data...');

    // 1. Delete existing Wall Cancer methods
    // We match by category OR by specific names to be safe
    const { error: delErr } = await supabase
        .from('methods')
        .delete()
        .eq('category', '一般壁癌修繕');

    if (delErr) {
        console.error('Error deleting methods:', delErr);
    } else {
        console.log('Deleted existing Wall Cancer methods (and cascaded recipes).');
    }

    // 2. Re-import
    console.log('Starting execution of import script...');
    try {
        execSync('node scripts/import_wall_cancer.js', { stdio: 'inherit' });
    } catch (e) {
        console.error('Import script failed:', e);
    }
}

reset();
