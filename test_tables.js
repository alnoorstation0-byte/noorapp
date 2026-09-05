require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const tables = ['materialitems', 'material_receipts', 'material_issues', 'material_items', 'inventory_items', 'materials'];
  for (const table of tables) {
    const res = await supabase.from(table).select('count', { count: 'exact', head: true });
    console.log(`Table ${table} count: ${res.count} error: ${JSON.stringify(res.error)}`);
  }
}

run();
