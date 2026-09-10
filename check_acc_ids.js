require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Check what accounts those IDs are
    const ids = ['2ced1a5a-9dc4-4495-bb6c-3ea56c02bde6', '990c949c-5f32-40d7-8d36-5fe45a6c892c', '2ca6f54c-5f37-49a0-8c41-e37f94b09752'];
    const { data } = await supabase.from('accounts').select('id, code, name').in('id', ids);
    console.log('Accounts:', JSON.stringify(data, null, 2));
}
main();
