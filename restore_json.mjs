import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS policies if possible, otherwise anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const backupFile = 'supabase_backup_2026-09-13_03-38-38.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

// Dependency order to avoid Foreign Key violations
const RESTORE_DEPENDENCY_ORDER = [
    'accounts',
    'profiles',
    'system_settings',
    'partners',
    'warehouses',
    'fleet_vehicles',
    'inventory_items',
    'warehouse_inventory',
    'fleet_operations',
    'pos_shifts',
    'invoices',
    'receipt_vouchers',
    'payment_vouchers',
    'expenses',
    'journal_headers',
    'journal_lines',
    'manual_journals',
    'inventory_transactions',
    'cash_flows',
    'payroll_slips'
];

async function restore() {
    console.log('Starting restore to:', supabaseUrl);
    
    const tablesInBackup = Object.keys(data.tables);
    const sortedTables = RESTORE_DEPENDENCY_ORDER.filter(t => tablesInBackup.includes(t));
    tablesInBackup.forEach(t => {
        if (!sortedTables.includes(t)) sortedTables.push(t);
    });

    let totalRestored = 0;
    
    for (const table of sortedTables) {
        const rows = data.tables[table];
        if (!rows || rows.length === 0) {
            console.log(`Skipping empty table: ${table}`);
            continue;
        }
        
        console.log(`Restoring table ${table} (${rows.length} rows)...`);
        
        // Upsert in chunks of 50
        let successCount = 0;
        for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            
            // Clean up JSON types or problematic fields if necessary (but Supabase JS client handles objects fine)
            
            const { error } = await supabase.from(table).upsert(chunk); // Upsert handles matching by Primary Key
            if (error) {
                console.error(`❌ Error inserting into ${table} (rows ${i} to ${i+chunk.length}):`, error.message);
            } else {
                successCount += chunk.length;
                totalRestored += chunk.length;
            }
        }
        console.log(`✅ Finished ${table}: ${successCount} rows inserted/updated.`);
    }
    console.log(`\n🎉 Restore complete! Total rows restored: ${totalRestored}`);
}

restore().catch(console.error);
