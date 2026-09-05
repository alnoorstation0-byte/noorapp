const fs = require('fs');

let page = fs.readFileSync('D:/waterapp/app/invoices/page.tsx', 'utf8');
page = page.replace(/row\.status === 'معتمد' \|\| row\.status === 'معتمد'/g, "row.status === 'posted' || row.status === 'معتمد'");
fs.writeFileSync('D:/waterapp/app/invoices/page.tsx', page);

let logic = fs.readFileSync('D:/waterapp/app/invoices/invoices_logic.ts', 'utf8');
logic = logic.replace(/inv\.status === 'معتمد' \|\| inv\.status === 'معتمد'/g, "inv.status === 'posted' || inv.status === 'معتمد'");
logic = logic.replace(/i\.status === 'معتمد'/g, "(i.status === 'posted' || i.status === 'معتمد')");
logic = logic.replace(/i\.status !== 'معتمد'/g, "(i.status !== 'posted' && i.status !== 'معتمد')");
logic = logic.replace(/currentInv\.status === 'معتمد' \|\| currentInv\.status === 'معتمد'/g, "currentInv.status === 'posted' || currentInv.status === 'معتمد'");
fs.writeFileSync('D:/waterapp/app/invoices/invoices_logic.ts', logic);
