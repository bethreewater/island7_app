
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

    // Check Cases
    const { data: cases, error: casesError } = await supabase.from('cases').select('caseId');
    if (casesError) console.error('Error fetching cases:', casesError);
    else console.log(`Found ${cases.length} cases.`);

    // Check Methods
    const { data: methods, error: methodsError } = await supabase.from('methods').select('id, name');
    if (methodsError) {
        console.error('Error fetching methods:', methodsError);
    } else {
        console.log(`Found ${methods.length} methods in Technical Manual.`);
        if (methods.length > 0) console.log(`Example: ${methods[0].name}`);
    }
}

listCases();
