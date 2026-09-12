const fs = require('fs');
let code = fs.readFileSync('app/pos/OpenShiftsModal.tsx', 'utf-8');

if (!code.includes('import { useLanguage }')) {
    code = code.replace(
        "import { THEME } from '@/lib/theme';",
        "import { THEME } from '@/lib/theme';\nimport { useLanguage } from '@/lib/LanguageContext';"
    );
}

code = code.replace(
    /export default function OpenShiftsModal\(\{([^}]+)\}\:\s*OpenShiftsModalProps\)\s*\{/s,
    (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

const replacements = [
    ["📋 الورديات النشطة حالياً بالنظام", "📋 {isEn ? 'Currently Active Shifts in System' : 'الورديات النشطة حالياً بالنظام'}"],
    ["لكل مندوب ولكل مستودع وردية مستقلة تماماً", "{isEn ? 'Each rep and branch has an independent shift' : 'لكل مندوب ولكل مستودع وردية مستقلة تماماً'}"],
    ["لا توجد أي وردية نشطة حالياً", "{isEn ? 'No active shifts currently' : 'لا توجد أي وردية نشطة حالياً'}"],
    ["يمكنك اختيار منفذ البيع والمندوب ثم الضغط على فتح وردية جديدة للبدء.", "{isEn ? 'You can select a branch and a rep, then click open new shift to start.' : 'يمكنك اختيار منفذ البيع والمندوب ثم الضغط على فتح وردية جديدة للبدء.'}"],
    ["✨ فتح وردية جديدة الآن", "✨ {isEn ? 'Open New Shift Now' : 'فتح وردية جديدة الآن'}"],
    ["'مستودع غير محدد'", "(isEn ? 'Unknown Branch' : 'مستودع غير محدد')"],
    ["🚚 سيارة", "🚚 {isEn ? 'Van' : 'سيارة'}"],
    ["'مبيعات مباشرة (بدون مندوب)'", "(isEn ? 'Direct Sales (No Rep)' : 'مبيعات مباشرة (بدون مندوب)')"],
    ["💵 العهدة:", "💵 {isEn ? 'Opening Cash:' : 'العهدة:'}"],
    ["ريال</strong>", "{isEn ? 'SAR' : 'ريال'}</strong>"],
    ["🕒 الفتح: <strong>", "🕒 {isEn ? 'Opened:' : 'الفتح:'} <strong>"],
    ["رقم الوردية:", "{isEn ? 'Shift ID:' : 'رقم الوردية:'}"],
    ["title=\"مراجعة ملف وتفاصيل الوردية كمرجع\"", "title={isEn ? 'Review shift file and details' : 'مراجعة ملف وتفاصيل الوردية كمرجع'}"],
    ["🔍 التفاصيل", "🔍 {isEn ? 'Details' : 'التفاصيل'}"],
    ["🟢 معروضة حالياً", "🟢 {isEn ? 'Currently Displayed' : 'معروضة حالياً'}"],
    ["⚡ التبديل إليها", "⚡ {isEn ? 'Switch to this' : 'التبديل إليها'}"],
    ["➕ فتح وردية جديدة لمستودع أو مندوب آخر", "➕ {isEn ? 'Open new shift for another branch/rep' : 'فتح وردية جديدة لمستودع أو مندوب آخر'}"]
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('app/pos/OpenShiftsModal.tsx', code);
console.log('OpenShiftsModal updated!');
