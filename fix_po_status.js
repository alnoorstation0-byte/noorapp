const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/purchase_orders/page.tsx', 'utf-8');

// Fix approved
const approvedRegex = /\['approved',\s*'[^']+',\s*'[^']+'\]\.includes\(row\.status\)/g;
content = content.replace(approvedRegex, "['approved', '?????', '????'].includes(row.status)");

// Fix pending
const pendingRegex = /\['pending',\s*'[^']+',\s*'[^']+'\]\.includes\(row\.status\)/g;
content = content.replace(pendingRegex, "['pending', '?????', '??? ????????'].includes(row.status)");

// Also fix the texts just in case
content = content.replace(/\? 'U.O3OU,U. dY"' : 'U.O1OU.O_ \(U,USO_ O U,O U\+OO,O O\) \?3'/g, "? '????? ?' : '??? ???????? ?'");
content = content.replace(/dY-",\? OO"O O1Oc/g, "?????");
content = content.replace(/dY" O O3OU,O U. O"O U,OU\+O,U.Oc/g, "? ???????? ???????? ???????");
content = content.replace(/dY"\? O3U\+O_ O O3OO-U,O U, O_U\?O1/g, "?? ????? ??????? ?????");
content = content.replace(/dY"" U\?U O U,O O1OU.O O_/g, "? ????? ????????");

fs.writeFileSync('D:/waterapp/app/purchase_orders/page.tsx', content, 'utf-8');
console.log('Fixed PO status strings');
