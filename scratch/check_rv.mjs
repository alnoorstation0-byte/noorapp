import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eirtdkutkfwcwiusnvcg.supabase.co';
const supabaseKey = 'sb_publishable_-B7V88bb48jBF7gj-XhyXA_m1Ym2AUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('receipt_vouchers').select('id, receipt_number, status, amount, partner_id').limit(10);
    console.log("Data:", data, "Error:", error);
}
check();
