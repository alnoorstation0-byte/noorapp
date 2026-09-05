import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    const { data, error } = await supabase.from('accounts').select('type').limit(10);
    console.log(data, error);
}
checkTypes();
