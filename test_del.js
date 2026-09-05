const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');

const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDelete() {
    const { data: errors, error: err1 } = await supabase.from('vw_advanced_audit').select('*');
    if (err1) {
        console.error('View Error:', err1);
        return;
    }
    
    console.log('Errors length:', errors?.length);
    if (!errors || errors.length === 0) {
        console.log('No errors found in view');
        return;
    }

    const item = errors[0];
    console.log('Attempting to delete:', item.error_id, item.table_name);

    const { error: err2 } = await supabase.rpc('smart_audit_delete', {
        p_error_id: item.error_id,
        p_table_name: item.table_name
    });

    if (err2) {
        console.error('RPC Error:', err2);
    } else {
        console.log('Deleted successfully!');
    }
}

testDelete();
