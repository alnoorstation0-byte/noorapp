import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

const backupFile = 'supabase_backup_2026-09-13_03-38-38.json';
const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

async function restoreAccounts() {
    let rows = data.tables['accounts'];
    if (!rows || rows.length === 0) return;
    
    console.log(`Restoring accounts (${rows.length} rows) with dependency handling...`);
    
    let pending = [...rows];
    let pass = 0;
    
    while (pending.length > 0 && pass < 10) {
        pass++;
        console.log(`Pass ${pass}, pending ${pending.length} rows...`);
        let nextPending = [];
        
        for (const row of pending) {
            const { error } = await supabase.from('accounts').upsert([row]);
            if (error) {
                // If it's a foreign key error, we'll try again next pass
                if (error.code === '23503') {
                    nextPending.push(row);
                } else {
                    console.error(`❌ Non-FK error inserting account ${row.name}:`, error.message);
                }
            }
        }
        
        if (nextPending.length === pending.length) {
            console.error(`Circular dependency or missing parents detected! Could not resolve ${nextPending.length} accounts.`);
            break;
        }
        
        pending = nextPending;
    }
    
    if (pending.length === 0) {
        console.log(`✅ Accounts fully restored!`);
    }
}

restoreAccounts().catch(console.error);
