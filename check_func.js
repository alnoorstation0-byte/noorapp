require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.rpc('update_inventory_quantity', { p_item_id: '00000000-0000-0000-0000-000000000000', p_quantity: 0, p_warehouse_id: '00000000-0000-0000-0000-000000000000' });
    console.log(error ? error.message : 'Exists');
}
run();
