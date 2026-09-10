require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Try to get RPC source by calling it with bad params
    const { data, error } = await supabase.rpc('post_expenses_bulk', { p_ids: [] });
    console.log('Result:', data, error?.message);
}
main();
