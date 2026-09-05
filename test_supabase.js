require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("Testing material_items...");
  const res1 = await supabase.from('material_items').select('*').limit(1);
  console.log("Items:", res1.data, "Error:", res1.error);

  console.log("Testing rpc_get_inventory_balances...");
  const res2 = await supabase.rpc('rpc_get_inventory_balances');
  console.log("Balances:", res2.data, "Error:", res2.error);

  console.log("Testing material_receipt_lines...");
  const res3 = await supabase.from('material_receipt_lines').select('id, quantity').limit(1);
  console.log("Receipt Lines:", res3.data, "Error:", res3.error);
}

run();
