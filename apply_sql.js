const fs = require('fs');

async function run() {
    const sql = fs.readFileSync('D:/waterapp/add_vehicle_id.sql', 'utf8');
    const res = await fetch('http://localhost:3000/api/run-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
    });
    
    if (res.ok) {
        const text = await res.text();
        console.log("Success:", text);
    } else {
        console.error("Error:", res.status, await res.text());
    }
}
run();
