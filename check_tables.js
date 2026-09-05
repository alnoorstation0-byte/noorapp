require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('material_receipts').select('*').limit(1);
  console.log("material_receipts exist:", !error, error);
  
  // query information_schema if possible via RPC, or just log any table
  const { data: tables, error: e2 } = await supabase.from('partners').select('*').limit(1);
  console.log("partners exist:", !e2, e2);
}

run();
