const fs = require('fs');

async function run() {
    const sql = "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'post_expenses_bulk';";
    const res = await fetch('http://localhost:3000/api/run-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
    });
    
    if (res.ok) {
        const text = await res.text();
        console.log(text);
    } else {
        console.error("Error:", res.status, await res.text());
    }
}
run();
