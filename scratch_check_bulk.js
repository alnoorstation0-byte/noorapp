const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'D:/waterapp/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('run_sql', { query: `
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE proname = 'post_invoices_bulk';
  ` });
  console.log(data, error);
}

check();
