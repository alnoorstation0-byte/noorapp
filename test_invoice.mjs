import fs from 'fs';

async function testInvoiceApproval() {
    const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
    
    // Create a fake invoice
    const invRes = await fetch(`${url}/rest/v1/invoices`, {
        method: 'POST',
        headers: { 
            'apikey': key, 
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            invoice_number: 'TEST-123',
            date: '2026-09-03',
            status: 'مسودة',
            total_amount: 5000,
            taxable_amount: 5000,
            tax_amount: 0,
            client_name: 'Test Client',
            lines_data: []
        })
    });
    
    const invData = await invRes.json();
    console.log("Created Invoice:", JSON.stringify(invData));

    if (!invData || invData.length === 0) return;

    const invId = invData[0].id;

    // Approve
    const rpcRes = await fetch(`${url}/rest/v1/rpc/post_invoices_bulk`, {
        method: 'POST',
        headers: { 
            'apikey': key, 
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_ids: [invId] })
    });

    if (!rpcRes.ok) {
        console.error("RPC Error:", rpcRes.status, await rpcRes.text());
        return;
    }
    console.log("RPC Success");

    // Check journals
    const headersRes = await fetch(`${url}/rest/v1/journal_headers?reference_id=eq.${invId}`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const headers = await headersRes.json();
    console.log("Headers for invoice:", JSON.stringify(headers, null, 2));
}
testInvoiceApproval();
