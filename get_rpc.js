require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgresql://postgres:' + process.env.DB_PASSWORD + '@db.') + ':5432/postgres'
});

async function main() {
    // Actually we can't easily get DB password from .env.local because Supabase doesn't put DB_PASSWORD there by default.
    console.log(process.env);
}
main();
