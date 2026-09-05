const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase
        .from('accounts')
        .select('id, name, account_type')
        .or('name.ilike.%ضريب%,name.ilike.%Tax%,name.ilike.%VAT%');
    
    if (error) console.error(error);
    else console.table(data);
}
run();
