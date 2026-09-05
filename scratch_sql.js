const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
    const { data: cols, error } = await supabase.rpc('get_table_schema', { table_name: 'fleet_operations' });
    console.log(cols || error);
}
check();
