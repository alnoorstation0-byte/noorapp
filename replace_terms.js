const fs = require('fs');
const path = require('path');

const replacements = [
    { from: /نظام إدارة العقود والمقاولات الذكي/g, to: 'نظام إدارة التجارة والمبيعات الذكي' },
    { from: /أعمال مقاولات/g, to: 'عمليات تجارية' },
    { from: /مقاولي الباطن/g, to: 'موردي الباطن' },
    { from: /مقاول باطن/g, to: 'مورد خارجي' },
    { from: /المقاولات/g, to: 'التجارة' },
    { from: /مقاولات/g, to: 'تجارة' },
    { from: /المقاولين/g, to: 'الموردين' },
    { from: /مقاولين/g, to: 'موردين' },
    { from: /المقاول/g, to: 'المورد' },
    { from: /مقاول/g, to: 'مورد' },
    
    { from: /المشاريع/g, to: 'الفروع' },
    { from: /مشاريع/g, to: 'فروع' },
    { from: /المشروع/g, to: 'الفرع' },
    { from: /مشروع/g, to: 'فرع' },
    
    { from: /بنود العمل/g, to: 'الأصناف' },
    { from: /البنود/g, to: 'الأصناف' },
    { from: /بنود/g, to: 'أصناف' },
    { from: /البند/g, to: 'الصنف' },
    { from: /بند/g, to: 'صنف' },
    
    { from: /مستخلص أعمال/g, to: 'تسوية مالية' },
    { from: /مستخلصات/g, to: 'تسويات' },
    { from: /مستخلص/g, to: 'تسوية' },
    { from: /الأعمال/g, to: 'العمليات' },
    { from: /أعمال/g, to: 'عمليات' },
    { from: /اعمال/g, to: 'عمليات' },
    
    { from: /العقار/g, to: 'المستودع' },
    { from: /عقار/g, to: 'مستودع' },
    { from: /عمارة/g, to: 'موقع' },
    { from: /الفيلا/g, to: 'نقطة البيع' },
    { from: /فيلا/g, to: 'نقطة بيع' },
    
    { from: /التريحة/g, to: 'التارجت' },
    { from: /إنتاجية/g, to: 'مبيعات' },
    { from: /صنايعي/g, to: 'سائق' }
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            for (const r of replacements) {
                content = content.replace(r.from, r.to);
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

walk('D:\\waterapp\\app');
console.log('Replacement complete.');
