const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
    let { data, error } = await supabase.rpc('get_sql', { sql_query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'post_expenses_bulk'" });
    if(error) {
        // use fallback pg dump or pg_proc query directly if possible via custom script
        const { data: d2, error: e2 } = await supabase.from('rpc_defs').select('*');
        console.log(e2);
    } else {
        console.log(data);
    }
}
run();
