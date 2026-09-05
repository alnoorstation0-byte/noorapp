const postgres = require('postgres');
const sql = postgres('postgres://postgres:Mooya12345!@db.eirtdkutkfwcwiusnvcg.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
    try {
        const triggers = await sql`
            SELECT event_object_table AS table_name, trigger_name, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table = 'receipt_vouchers'`;
        console.log(triggers);
    } catch(e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}
run();
