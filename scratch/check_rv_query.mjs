import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eirtdkutkfwcwiusnvcg.supabase.co';
const supabaseKey = 'sb_publishable_-B7V88bb48jBF7gj-XhyXA_m1Ym2AUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('receipt_vouchers')
        .select(`*, partners!receipt_vouchers_partner_id_fkey(name), invoices(invoice_number)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
    console.log("Data:", JSON.stringify(data, null, 2), "Error:", error);
}
check();
