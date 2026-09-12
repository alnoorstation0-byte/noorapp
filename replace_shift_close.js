const fs = require('fs');
let code = fs.readFileSync('app/pos/ShiftCloseModal.tsx', 'utf-8');

if (!code.includes('import { useLanguage }')) {
    code = code.replace(
        "import { THEME } from '@/lib/theme';",
        "import { THEME } from '@/lib/theme';\nimport { useLanguage } from '@/lib/LanguageContext';"
    );
}

code = code.replace(
    /export default function ShiftCloseModal\(\{([^}]+)\}\:\s*ShiftCloseModalProps\)\s*\{/s,
    (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

const replacements = [
    [".neq('status', 'ملغي');", ".neq('status', 'ملغي'); // Arabic status check remains in logic"],
    ["setActualBottlesReturned(soldUnits); // الافتراضي مطابقة كاملة", "setActualBottlesReturned(soldUnits);"],
    ["throw new Error('الرجاء إدخال النقدية الفعلية الموجودة في الدرج');", "throw new Error(isEn ? 'Please enter the actual cash in the register' : 'الرجاء إدخال النقدية الفعلية الموجودة في الدرج');"],
    ["showToast('تم إغلاق الوردية وتقفيل الصندوق وعهدة الفوارغ بنجاح 🔒', 'success');", "showToast(isEn ? 'Shift closed and register reconciled successfully 🔒' : 'تم إغلاق الوردية وتقفيل الصندوق وعهدة الفوارغ بنجاح 🔒', 'success');"],
    ["<h3 style={{ color: '#1C73AB', marginBottom: '10px', fontWeight: 900, fontSize: '20px' }}>لا توجد وردية نشطة حالياً</h3>", "<h3 style={{ color: '#1C73AB', marginBottom: '10px', fontWeight: 900, fontSize: '20px' }}>{isEn ? 'No active shift' : 'لا توجد وردية نشطة حالياً'}</h3>"],
    ["لا توجد وردية مفتوحة حالياً لحسابك لإغلاقها. يمكنك فتح وردية جديدة من شريط التحكم بأعلى الشاشة.", "{isEn ? 'You do not have an active shift to close. You can open a new shift from the top control bar.' : 'لا توجد وردية مفتوحة حالياً لحسابك لإغلاقها. يمكنك فتح وردية جديدة من شريط التحكم بأعلى الشاشة.'}"],
    ["حسناً، فهمت", "{isEn ? 'Got it' : 'حسناً، فهمت'}"],
    ["<h2 style={{ color: '#1C73AB', margin: 0, fontSize: '20px', fontWeight: 900 }}>🔒 تقفيل الصندوق والوردية (Z-Report)</h2>", "<h2 style={{ color: '#1C73AB', margin: 0, fontSize: '20px', fontWeight: 900 }}>🔒 {isEn ? 'Close Register & Shift (Z-Report)' : 'تقفيل الصندوق والوردية (Z-Report)'}</h2>"],
    ["وردية رقم:", "{isEn ? 'Shift ID:' : 'وردية رقم:'}"],
    ["🏪 منفذ البيع:", "🏪 {isEn ? 'Branch:' : 'منفذ البيع:'}"],
    ["'مستودع غير محدد'", "(isEn ? 'Unknown Branch' : 'مستودع غير محدد')"],
    ["👤 المندوب / الكاشير:", "👤 {isEn ? 'Cashier / Rep:' : 'المندوب / الكاشير:'}"],
    ["'مبيعات مباشرة (بدون مندوب)'", "(isEn ? 'Direct Sales (No Rep)' : 'مبيعات مباشرة (بدون مندوب)')"],
    ["🕒 وقت الفتح:", "🕒 {isEn ? 'Open Time:' : 'وقت الفتح:'}"],
    ["⏳ جاري جرد وحساب مبيعات الوردية...", "{isEn ? '⏳ Calculating shift sales...' : '⏳ جاري جرد وحساب مبيعات الوردية...'}"],
    ["💵 العهدة الافتتاحية:", "💵 {isEn ? 'Opening Cash:' : 'العهدة الافتتاحية:'}"],
    ["ريال", "{isEn ? 'SAR' : 'ريال'}"],
    ["💰 المبيعات النقدية (كاش):", "💰 {isEn ? 'Cash Sales:' : 'المبيعات النقدية (كاش):'}"],
    ["💳 مبيعات الشبكة / مدى:", "💳 {isEn ? 'Card / POS Sales:' : 'مبيعات الشبكة / مدى:'}"],
    ["📋 المبيعات الآجلة:", "📋 {isEn ? 'Credit Sales:' : 'المبيعات الآجلة:'}"],
    ["🏦 النقدية المتوقعة بالدرج:", "🏦 {isEn ? 'Expected Cash in Register:' : 'النقدية المتوقعة بالدرج:'}"],
    ["💵 المبلغ الفعلي الموجود في الدرج الآن (بعد العد):", "💵 {isEn ? 'Actual Cash in Register (Counted):' : 'المبلغ الفعلي الموجود في الدرج الآن (بعد العد):'}"],
    ["? '✅ الصندوق مطابق تماماً (لا يوجد عجز أو زيادة)'", "? (isEn ? '✅ Register matches exactly (No variance)' : '✅ الصندوق مطابق تماماً (لا يوجد عجز أو زيادة)')"],
    ["? `💰 يوجد زيادة بقيمة: +${difference.toFixed(2)} ريال`", "? (isEn ? `💰 Surplus amount: +${difference.toFixed(2)} SAR` : `💰 يوجد زيادة بقيمة: +${difference.toFixed(2)} ريال`)"],
    [": `⚠️ يوجد عجز بقيمة: -${Math.abs(difference).toFixed(2)} ريال`}", ": (isEn ? `⚠️ Shortage amount: -${Math.abs(difference).toFixed(2)} SAR` : `⚠️ يوجد عجز بقيمة: -${Math.abs(difference).toFixed(2)} ريال`)}"],
    ["🔄 عهدة فوارغ المياه المباعة:", "🔄 {isEn ? 'Sold Returnables Custody:' : 'عهدة فوارغ المياه المباعة:'}"],
    ["عبوة / جالون", "{isEn ? 'Bottles / Gallons' : 'عبوة / جالون'}"],
    ["عدد الفوارغ المستلمة فعلياً:", "{isEn ? 'Actual returnables received:' : 'عدد الفوارغ المستلمة فعلياً:'}"],
    ["placeholder=\"الفوارغ\"", "placeholder={isEn ? 'Returnables' : 'الفوارغ'}"],
    ["? '✅ الفوارغ مطابقة تماماً'", "? (isEn ? '✅ Returnables match exactly' : '✅ الفوارغ مطابقة تماماً')"],
    ["? `⚠️ عجز فوارغ: ${bottlesShortage} عبوة (تُقيد كذمة على المندوب)`", "? (isEn ? `⚠️ Returnables shortage: ${bottlesShortage} bottles (Charged to rep)` : `⚠️ عجز فوارغ: ${bottlesShortage} عبوة (تُقيد كذمة على المندوب)`)"],
    [": `ℹ️ فوارغ إضافية مستلمة: +${Math.abs(bottlesShortage)} عبوة`}", ": (isEn ? `ℹ️ Extra returnables received: +${Math.abs(bottlesShortage)} bottles` : `ℹ️ فوارغ إضافية مستلمة: +${Math.abs(bottlesShortage)} عبوة`)}"],
    ["{closeShiftMutation.isPending ? '⏳ جاري الإغلاق...' : '🔒 تأكيد وإغلاق الصندوق'}", "{closeShiftMutation.isPending ? (isEn ? '⏳ Closing...' : '⏳ جاري الإغلاق...') : (isEn ? '🔒 Confirm & Close Register' : '🔒 تأكيد وإغلاق الصندوق')}"],
    [">إلغاء<", ">{isEn ? 'Cancel' : 'إلغاء'}<"]
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('app/pos/ShiftCloseModal.tsx', code);
console.log('ShiftCloseModal updated!');
