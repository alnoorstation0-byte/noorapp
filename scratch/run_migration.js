const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function run() {
    const sql = postgres('postgres://postgres:Mooya12345!@db.ggzuaaivrrcuowwemobt.supabase.co:5432/postgres', { ssl: 'require' });
    const query = fs.readFileSync(path.join(__dirname, 'create_view.sql'), 'utf8');
    try {
        await sql.unsafe(query);
        console.log("Migration successful!");
    } catch(e) {
        console.error("Migration failed:", e);
    } finally {
        await sql.end();
    }
}
run();
