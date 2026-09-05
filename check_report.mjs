import fs from 'fs';

async function checkReport() {
    const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
    const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    
    const url = urlMatch ? urlMatch[1].trim() : '';
    const key = keyMatch ? keyMatch[1].trim() : '';
    
    const rpcRes = await fetch(`${url}/rest/v1/rpc/get_accounts_report_with_lines`, {
        method: 'POST',
        headers: { 
            'apikey': key, 
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_date_from: '1900-01-01', p_date_to: '2099-12-31' })
    });

    const data = await rpcRes.json();
    console.log(JSON.stringify(data.filter(x => x.total_debit > 0 || x.total_credit > 0), null, 2));
}
checkReport();
