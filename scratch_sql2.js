const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
    let { data: cols, error } = await supabase.from('fleet_operations').select('*').limit(1);
    console.log("fleet_operations:", cols && cols.length ? Object.keys(cols[0]) : 'no data');
    
    // We can also just insert a dummy and delete it to see columns if no data, but let's query the table itself.
}
check();
