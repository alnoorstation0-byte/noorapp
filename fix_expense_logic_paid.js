const fs = require('fs');
let content = fs.readFileSync('D:/waterapp/app/expenses/expenses_logic.ts', 'utf-8');

content = content.replace(/const total = baseAmount \+ Number\(exp\.vat_amount \|\| 0\) - Number\(exp\.discount_amount \|\| 0\);/g, "const total = Math.round((baseAmount + Number(exp.vat_amount || 0) - Number(exp.discount_amount || 0)) * 100) / 100;");
content = content.replace(/const paid = Number\(exp\.paid_amount \|\| 0\);/g, "const paid = Math.round(Number(exp.paid_amount || 0) * 100) / 100;");
content = content.replace(/if \(paymentFilter === '???? ????'\) return paid > 0 && paid < total;/g, "if (paymentFilter === '???? ????') return paid > 0 && paid < total - 0.01;");
content = content.replace(/if \(paymentFilter === '????'\) return paid >= total && total > 0;/g, "if (paymentFilter === '????') return paid >= total - 0.01 && total > 0;");

fs.writeFileSync('D:/waterapp/app/expenses/expenses_logic.ts', content, 'utf-8');
console.log('Fixed Logic');
