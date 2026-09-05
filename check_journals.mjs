import fs from 'fs';

async function checkJournals() {
    const env = fs.readFileSync('D:/waterapp/.env.local', 'utf8');
    const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    
    const url = urlMatch ? urlMatch[1].trim() : '';
    const key = keyMatch ? keyMatch[1].trim() : '';
    
    const headersRes = await fetch(`${url}/rest/v1/journal_headers?order=created_at.desc&limit=5`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const headers = await headersRes.json();
    console.log("Headers:", JSON.stringify(headers, null, 2));

    if (headers && headers.length > 0) {
        const linesRes = await fetch(`${url}/rest/v1/journal_lines?header_id=eq.${headers[0].id}`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const lines = await linesRes.json();
        console.log("Lines for newest header:", JSON.stringify(lines, null, 2));
    }
}
checkJournals();
