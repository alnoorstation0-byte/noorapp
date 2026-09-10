require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.rpc('execute_sql', { query: "SELECT prosrc FROM pg_proc WHERE proname = 'approve_inventory_transaction'" });
    console.log(data || error);
}
main();
