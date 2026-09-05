const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');

const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSelect() {
    const { data, error } = await supabase
        .from('vw_advanced_audit')
        .select('ref_id')
        .eq('error_id', 'GHOST_f2e844d9-0de0-49f8-834b-3f8dbcdc2810');
    console.log("Select Error:", error);
    console.log("Select Data:", data);
}
testSelect();
