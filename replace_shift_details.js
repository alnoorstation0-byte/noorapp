const fs = require('fs');
let code = fs.readFileSync('app/pos/ShiftDetailsModal.tsx', 'utf-8');

if (!code.includes('import { useLanguage }')) {
    code = code.replace(
        "import { THEME } from '@/lib/theme';",
        "import { THEME } from '@/lib/theme';\nimport { useLanguage } from '@/lib/LanguageContext';"
    );
}

code = code.replace(
    /export default function ShiftDetailsModal\(\{([^}]+)\}\:\s*ShiftDetailsModalProps\)\s*\{/s,
    (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

const replacements = [
    ["throw new Error(json.error || 'فشل جلب تفاصيل الوردية');", "throw new Error(json.error || (isEn ? 'Failed to fetch shift details' : 'فشل جلب تفاصيل الوردية'));"],
    ["return (Number(amt) || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ريال';", "return (Number(amt) || 0).toLocaleString(isEn ? 'en-US' : 'ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (isEn ? ' SAR' : ' ريال');"],
    ["ملف تفاصيل ومراجعة الوردية", "{isEn ? 'Shift Details & Review File' : 'ملف تفاصيل ومراجعة الوردية'}"],
    ["{details.status === 'open' ? '🟢 مفتوحة حالياً' : '🔒 مغلقة'}", "{details.status === 'open' ? (isEn ? '🟢 Open Now' : '🟢 مفتوحة حالياً') : (isEn ? '🔒 Closed' : '🔒 مغلقة')}"],
    ["مرجع محاسبي معتمد لجرد الصندوق، المبيعات، الفواتير، وفوارغ العبوات", "{isEn ? 'Approved accounting reference for cash register, sales, invoices, and returnables' : 'مرجع محاسبي معتمد لجرد الصندوق، المبيعات، الفواتير، وفوارغ العبوات'}"],
    ["🖨️ طباعة المرجع", "🖨️ {isEn ? 'Print Reference' : 'طباعة المرجع'}"],
    ["⏳ جاري استرجاع تفاصيل الوردية وفحص القيود...", "{isEn ? '⏳ Retrieving shift details and checking journals...' : '⏳ جاري استرجاع تفاصيل الوردية وفحص القيود...'}"],
    ["رقم الوردية:", "{isEn ? 'Shift ID:' : 'رقم الوردية:'}"],
    ["منفذ البيع / المستودع:", "{isEn ? 'Branch / Warehouse:' : 'منفذ البيع / المستودع:'}"],
    ["المندوب المسؤول:", "{isEn ? 'Responsible Rep:' : 'المندوب المسؤول:'}"],
    ["أمين الصندوق (الكاشير):", "{isEn ? 'Cashier:' : 'أمين الصندوق (الكاشير):'}"],
    ["تاريخ ووقت الفتح:", "{isEn ? 'Opened At:' : 'تاريخ ووقت الفتح:'}"],
    ["تاريخ ووقت الإغلاق:", "{isEn ? 'Closed At:' : 'تاريخ ووقت الإغلاق:'}"],
    ["{details.closed_at ? new Date(details.closed_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'قيد التشغيل ⏳'}", "{details.closed_at ? new Date(details.closed_at).toLocaleString(isEn ? 'en-US' : 'ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : (isEn ? 'Running ⏳' : 'قيد التشغيل ⏳')}"],
    ["💰 المطابقة المالية والصندوق", "💰 {isEn ? 'Financials & Register' : 'المطابقة المالية والصندوق'}"],
    ["📦 الأصناف المباعة", "📦 {isEn ? 'Sold Items' : 'الأصناف المباعة'}"],
    ["📋 سجل الفواتير", "📋 {isEn ? 'Invoices Log' : 'سجل الفواتير'}"],
    ["💵 العهدة الافتتاحية:", "💵 {isEn ? 'Opening Cash:' : 'العهدة الافتتاحية:'}"],
    ["💰 المقبوض نقداً (كاش):", "💰 {isEn ? 'Cash Received:' : 'المقبوض نقداً (كاش):'}"],
    ["🏦 النقد المتوقع بالدرج:", "🏦 {isEn ? 'Expected Cash:' : 'النقد المتوقع بالدرج:'}"],
    ["💵 النقد الفعلي عند الجرد:", "💵 {isEn ? 'Actual Cash Counted:' : 'النقد الفعلي عند الجرد:'}"],
    ["'قيد العمل'", "(isEn ? 'Running' : 'قيد العمل')"],
    ["? '✅ الصندوق مطابق تماماً بنسبة 100% (لا يوجد عجز أو زيادة)'", "? (isEn ? '✅ Register matches 100% perfectly (No variance)' : '✅ الصندوق مطابق تماماً بنسبة 100% (لا يوجد عجز أو زيادة)')"],
    ["? `💰 يوجد زيادة في الصندوق بقيمة: +${formatCurrency(details.financials.shortage_overage)}`", "? (isEn ? `💰 Surplus cash in register: +${formatCurrency(details.financials.shortage_overage)}` : `💰 يوجد زيادة في الصندوق بقيمة: +${formatCurrency(details.financials.shortage_overage)}`)"],
    [": `⚠️ يوجد عجز نقدي في الصندوق بقيمة: -${formatCurrency(Math.abs(details.financials.shortage_overage))}`}", ": (isEn ? `⚠️ Cash shortage in register: -${formatCurrency(Math.abs(details.financials.shortage_overage))}` : `⚠️ يوجد عجز نقدي في الصندوق بقيمة: -${formatCurrency(Math.abs(details.financials.shortage_overage))}`)}"],
    ["💳 تفصيل قنوات السداد والإيرادات الإجمالية", "💳 {isEn ? 'Payment Channels & Total Revenue' : 'تفصيل قنوات السداد والإيرادات الإجمالية'}"],
    ["💳 مبيعات الشبكة (مدى):", "💳 {isEn ? 'Card / POS Sales:' : 'مبيعات الشبكة (مدى):'}"],
    ["📋 المبيعات الآجلة (ذمم عملاء):", "📋 {isEn ? 'Credit Sales (A/R):' : 'المبيعات الآجلة (ذمم عملاء):'}"],
    ["🛒 إجمالي مبيعات الوردية:", "🛒 {isEn ? 'Total Shift Sales:' : 'إجمالي مبيعات الوردية:'}"],
    ["<span>{isLoss ? 'تحليل نتائج الوردية (عجز / خسائر تشغيلية)' : 'تحليل أرباح الوردية والتشغيل (Profitability)'}</span>", "<span>{isLoss ? (isEn ? 'Shift Results (Shortage / Operating Loss)' : 'تحليل نتائج الوردية (عجز / خسائر تشغيلية)') : (isEn ? 'Shift Profitability & Operations' : 'تحليل أرباح الوردية والتشغيل (Profitability)')}</span>"],
    ["هامش الربح: {margin}%", "{isEn ? 'Profit Margin:' : 'هامش الربح:'} {margin}%"],
    ["📦 تكلفة البضاعة المباعة (COGS):", "📦 {isEn ? 'Cost of Goods Sold (COGS):' : 'تكلفة البضاعة المباعة (COGS):'}"],
    ["💸 مصروفات الوردية التشغيلية:", "💸 {isEn ? 'Operating Expenses:' : 'مصروفات الوردية التشغيلية:'}"],
    ["{gross >= 0 ? '✨ مجمل الربح (قبل المصروفات):' : '⚠️ مجمل الخسارة (قبل المصروفات):'}", "{gross >= 0 ? (isEn ? '✨ Gross Profit (Before Exp.):' : '✨ مجمل الربح (قبل المصروفات):') : (isEn ? '⚠️ Gross Loss (Before Exp.):' : '⚠️ مجمل الخسارة (قبل المصروفات):')}"],
    ["{isLoss ? '🚨 صافي خسائر الوردية النهائي:' : '🎯 صافي ربح الوردية النهائي:'}", "{isLoss ? (isEn ? '🚨 Net Shift Loss:' : '🚨 صافي خسائر الوردية النهائي:') : (isEn ? '🎯 Net Shift Profit:' : '🎯 صافي ربح الوردية النهائي:')}"],
    ["🔄 جرد عهدة فوارغ المياه والعبوات", "🔄 {isEn ? 'Returnables Custody Inventory' : 'جرد عهدة فوارغ المياه والعبوات'}"],
    ["العبوات المباعة:", "{isEn ? 'Bottles Sold:' : 'العبوات المباعة:'}"],
    ["عبوة</strong>", "{isEn ? 'Bottles' : 'عبوة'}</strong>"],
    ["الفوارغ المستلمة فعلياً:", "{isEn ? 'Actual Returnables:' : 'الفوارغ المستلمة فعلياً:'}"],
    ["عجز / فارق الفوارغ:", "{isEn ? 'Returnables Variance:' : 'عجز / فارق الفوارغ:'}"],
    ["{details.bottles.shortage === 0 ? 'مطابقة تماماً ✅' : `${details.bottles.shortage} عبوة عجز ⚠️`}", "{details.bottles.shortage === 0 ? (isEn ? 'Matches perfectly ✅' : 'مطابقة تماماً ✅') : (isEn ? `${details.bottles.shortage} bottles short ⚠️` : `${details.bottles.shortage} عبوة عجز ⚠️`)}"],
    ["<th>اسم الصنف</th>", "<th>{isEn ? 'Item Name' : 'اسم الصنف'}</th>"],
    ["<th style={{ textAlign: 'center' }}>الكمية المباعة</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Qty Sold' : 'الكمية المباعة'}</th>"],
    ["<th style={{ textAlign: 'center' }}>متوسط السعر</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Avg Price' : 'متوسط السعر'}</th>"],
    ["<th style={{ textAlign: 'center' }}>إجمالي الإيراد</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Total Revenue' : 'إجمالي الإيراد'}</th>"],
    ["<th style={{ textAlign: 'center' }}>إجمالي التكلفة</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Total Cost' : 'إجمالي التكلفة'}</th>"],
    ["<th style={{ textAlign: 'center' }}>مجمل الربح</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Gross Profit' : 'مجمل الربح'}</th>"],
    ["<th style={{ textAlign: 'center' }}>هامش الربح</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Profit Margin' : 'هامش الربح'}</th>"],
    ["لم يتم تسجيل أي مبيعات أصناف في هذه الوردية بعد.", "{isEn ? 'No item sales recorded in this shift yet.' : 'لم يتم تسجيل أي مبيعات أصناف في هذه الوردية بعد.'}"],
    ["<th>رقم الفاتورة</th>", "<th>{isEn ? 'Invoice ID' : 'رقم الفاتورة'}</th>"],
    ["<th>العميل</th>", "<th>{isEn ? 'Customer' : 'العميل'}</th>"],
    ["<th>طريقة الدفع</th>", "<th>{isEn ? 'Payment Method' : 'طريقة الدفع'}</th>"],
    ["<th style={{ textAlign: 'center' }}>الوقت</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Time' : 'الوقت'}</th>"],
    ["<th style={{ textAlign: 'center' }}>المبلغ</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Amount' : 'المبلغ'}</th>"],
    ["<th style={{ textAlign: 'center' }}>الحالة</th>", "<th style={{ textAlign: 'center' }}>{isEn ? 'Status' : 'الحالة'}</th>"],
    ["inv.payment_method?.includes('كاش')", "inv.payment_method?.includes('كاش') || inv.payment_method?.toLowerCase().includes('cash')"],
    ["inv.payment_method?.includes('آجل')", "inv.payment_method?.includes('آجل') || inv.payment_method?.toLowerCase().includes('credit')"],
    ["{inv.status || 'معتمد'}", "{inv.status || (isEn ? 'Approved' : 'معتمد')}"],
    ["لا توجد فواتير مصدرة ضمن هذه الوردية.", "{isEn ? 'No invoices issued in this shift.' : 'لا توجد فواتير مصدرة ضمن هذه الوردية.'}"]
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('app/pos/ShiftDetailsModal.tsx', code);
console.log('ShiftDetailsModal updated!');
