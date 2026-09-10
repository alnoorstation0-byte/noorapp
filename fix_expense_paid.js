const fs = require('fs');

let content = fs.readFileSync('D:/waterapp/app/expenses/page.tsx', 'utf-8');

// Use Math.round to avoid JS floating point issues
content = content.replace(/const total = basePrice \+ Number\(row\.vat_amount \|\| 0\) - Number\(row\.discount_amount \|\| 0\);/g, "const total = Math.round((basePrice + Number(row.vat_amount || 0) - Number(row.discount_amount || 0)) * 100) / 100;");
content = content.replace(/const paid = Number\(row\.paid_amount \|\| 0\);/g, "const paid = Math.round(Number(row.paid_amount || 0) * 100) / 100;");
content = content.replace(/const total = row\.total_price \|\| \(\(Number\(row\.quantity \|\| 1\) \* Number\(row\.unit_price \|\| 0\)\) \+ Number\(row\.vat_amount \|\| 0\) - Number\(row\.discount_amount \|\| 0\)\);/g, "const basePrice2 = row.total_price ? Number(row.total_price) : (Number(row.quantity || 1) * Number(row.unit_price || 0));\n          const total = Math.round((basePrice2 + Number(row.vat_amount || 0) - Number(row.discount_amount || 0)) * 100) / 100;");

content = content.replace(/if \(paid > 0 && paid < total\)/g, "if (paid > 0 && paid < total - 0.01)");

fs.writeFileSync('D:/waterapp/app/expenses/page.tsx', content, 'utf-8');
console.log('Fixed');
