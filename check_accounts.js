require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Check if account 219 exists
    const { data: acc219, error: err1 } = await supabase.from('accounts').select('*').eq('code', '219');
    console.log('Account 219:', JSON.stringify(acc219));
    
    // Check if account 211 exists
    const { data: acc211, error: err2 } = await supabase.from('accounts').select('*').eq('code', '211');
    console.log('Account 211:', JSON.stringify(acc211));

    // Check a recently created PO entitlement expense
    const { data: poExp } = await supabase.from('expenses').select('*').like('expense_number', 'PO-%').order('created_at', {ascending: false}).limit(3);
    console.log('PO Expenses:', JSON.stringify(poExp, null, 2));
}
main();
