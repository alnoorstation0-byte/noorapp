require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('material_receipt_lines').select('*').limit(1);
  if (error) console.log("Receipt lines error:", error);
  else console.log("Receipt lines OK");
  
  const { data: d2, error: e2 } = await supabase.from('material_issue_lines').select('*').limit(1);
  if (e2) console.log("Issue lines error:", e2);
  else console.log("Issue lines OK");
}

run();
