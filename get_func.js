require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function createFunc() {
    // Wait, we can't create an RPC from client if we don't have SQL execution endpoint...
    // Let's check if the frontend exposes any query endpoint... no.
}
