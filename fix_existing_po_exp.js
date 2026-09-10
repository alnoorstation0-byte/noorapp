require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Fix all PO expenses with duplicated PO-PO- prefix and wrong paid_amount
    const { data: poExps } = await supabase.from('expenses').select('id, expense_number, paid_amount, is_posted').like('expense_number', 'PO-PO-%');
    console.log('Found PO-PO- expenses:', poExps?.length);
    
    for (const exp of (poExps || [])) {
        const fixedNumber = exp.expense_number.replace(/^PO-PO-/, 'PO-');
        console.log('Fixing:', exp.expense_number, '->', fixedNumber, '| paid_amount:', exp.paid_amount, '-> 0');
        
        const { error } = await supabase.from('expenses').update({ 
            expense_number: fixedNumber,
            paid_amount: 0
        }).eq('id', exp.id);
        
        if (error) console.log('Error:', error.message);
        else console.log('Fixed!');
    }
}
main();
