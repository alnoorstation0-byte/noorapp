const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const content = fs.readFileSync('D:/waterapp/.env.local', 'utf-8');
const url = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = content.match(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function run() {
    const { data } = await supabase.rpc('get_function_def', { func_name: 'approve_inventory_transaction' });
    console.log(data);
}
run();
