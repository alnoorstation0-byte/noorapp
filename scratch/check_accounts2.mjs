import { createClient } from '@supabase/supabase-js';

// read env variables from .env.local
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  // Query 1 row to see properties
  const { data, error } = await supabase.from('accounts').select('*').limit(1);
  console.log(error || Object.keys(data[0] || {}));
}
check();
