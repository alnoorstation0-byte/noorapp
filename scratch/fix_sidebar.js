const fs = require('fs');
const filePath = 'D:/waterapp/components/Sidebar.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const menuItems = \[([\s\S]*?)\];/;

const newMenuItems = `const menuItems = [
    { name: 'لوحة القيادة', icon: '🏠', path: '/Dashboard' },
    { name: 'رحلات التشغيل', icon: '🚚', path: '/fleet_operations' },
    { name: 'الفواتير والمبيعات', icon: '🧾', path: '/invoices' },
    { name: 'المخزون', icon: '📦', path: '/inventory' },
    { name: 'سندات القبض والصرف', icon: '💵', path: '/ReceiptVouchers' },
    { name: 'التقارير المحاسبية', icon: '📊', path: '/journal' }
  ];`;

content = content.replace(regex, newMenuItems);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Sidebar fixed');
