
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCases() {
    console.log('Connecting to:', supabaseUrl);
    const { data, error } = await supabase.from('cases').select('caseId, customerName, status');

    if (error) {
        console.error('Error fetching cases:', error);
    } else {
        console.log(`Found ${data.length} cases:`);
        data.forEach(c => console.log(`- [${c.status}] ${c.customerName} (${c.caseId})`));
    }
}

listCases();
