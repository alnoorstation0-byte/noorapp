const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://localhost:54321', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY4MjI2MjM5NywiZXhwIjoyMjk3ODM4Mzk3fQ.Z...'); // Wait I can just use the .env.local

require('dotenv').config({ path: 'D:/waterapp/.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const res = await pool.query(`
    SELECT prosrc 
    FROM pg_proc 
    WHERE proname = 'update_inventory_quantity'
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
main();
