import postgres from 'postgres';
import fs from 'fs';

const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
// Wait, to connect via `postgres.js` we need a DB connection string, not just REST URL/anon key!
// Let's check if DATABASE_URL or something is in .env.local
console.log(env);
