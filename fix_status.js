const fs = require('fs');

let content = fs.readFileSync('D:/waterapp/app/inventory/transactions/page.tsx', 'utf-8');

content = content.replace(/row\.status === 'pending'/g, "['pending', '?????', '??? ????????'].includes(row.status)");
content = content.replace(/row\.status === 'approved'/g, "['approved', '?????', '????'].includes(row.status)");

fs.writeFileSync('D:/waterapp/app/inventory/transactions/page.tsx', content, 'utf-8');
console.log('Done');
