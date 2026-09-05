const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
    const { data: fleet_operations, error } = await supabase.from('fleet_operations').select('*').limit(1);
    if (error) console.error(error);
    else console.log('fleet_operations columns:', fleet_operations && fleet_operations.length > 0 ? Object.keys(fleet_operations[0]) : 'no data');
}
check();
