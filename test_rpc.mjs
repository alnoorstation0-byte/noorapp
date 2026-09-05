import fs from 'fs';

async function testRPC() {
    const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
    const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    
    const url = urlMatch ? urlMatch[1].trim() : '';
    const key = keyMatch ? keyMatch[1].trim() : '';
    
    // Find a pending inventory transaction
    const txRes = await fetch(`${url}/rest/v1/inventory_transactions?status=eq.pending&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const tx = await txRes.json();
    if (!tx || tx.length === 0) {
        console.log("No pending transactions found");
        return;
    }

    const txId = tx[0].id;
    console.log("Approving TX:", txId);

    // Call RPC
    const rpcRes = await fetch(`${url}/rest/v1/rpc/approve_inventory_transaction`, {
        method: 'POST',
        headers: { 
            'apikey': key, 
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_id: txId })
    });

    if (!rpcRes.ok) {
        console.error("RPC Error:", await rpcRes.text());
        return;
    }

    console.log("RPC Success");
    
    // Check journals
    const headersRes = await fetch(`${url}/rest/v1/journal_headers?reference_id=eq.${txId}`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const headers = await headersRes.json();
    console.log("Headers for tx:", JSON.stringify(headers, null, 2));

    if (headers && headers.length > 0) {
        const linesRes = await fetch(`${url}/rest/v1/journal_lines?header_id=eq.${headers[0].id}`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const lines = await linesRes.json();
        console.log("Lines for header:", JSON.stringify(lines, null, 2));
    }
}
testRPC();
