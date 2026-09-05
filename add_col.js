import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS executor_type text DEFAULT 'تنفيذ ذاتي';"
    });
    console.log("Alter table result:", error || "Success");
}
run();
