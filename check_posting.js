require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Check if there are any journal entries referencing account 219
    const acc219Id = 'c4b01e7f-b892-4517-bdc9-7cc97d8112f6';
    const { data: journalLines } = await supabase.from('journal_lines').select('id, header_id, account_id, debit, credit').eq('account_id', acc219Id).limit(5);
    console.log('Journal lines for acc 219:', JSON.stringify(journalLines, null, 2));
    
    // Check the post_expenses_bulk RPC - see if it creates journal entries with the right accounts
    // Check the expense that was just fixed
    const { data: exp } = await supabase.from('expenses').select('*').eq('expense_number', 'PO-766671').single();
    console.log('Fixed expense:', JSON.stringify({id: exp?.id, is_posted: exp?.is_posted, paid_amount: exp?.paid_amount, creditor_account: exp?.creditor_account, payment_account: exp?.payment_account}, null, 2));
}
main();
