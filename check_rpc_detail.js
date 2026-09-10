require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    // Check journal for the PO expense
    const expId = 'cee875ad-8f54-4750-8c2b-5744e73a700c';
    
    // Find any journal header referencing this expense
    const { data: headers } = await supabase.from('journal_headers').select('id, entry_date, description, reference_id').eq('reference_id', expId);
    console.log('Journal headers for this expense:', JSON.stringify(headers, null, 2));
    
    if (headers && headers.length > 0) {
        for (const h of headers) {
            const { data: lines } = await supabase.from('journal_lines').select('id, account_id, debit, credit, item_name, notes').eq('header_id', h.id);
            console.log('Lines for header', h.id, ':', JSON.stringify(lines, null, 2));
        }
    }
}
main();
