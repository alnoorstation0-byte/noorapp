const fs = require('fs');

let code = fs.readFileSync('app/pos/ShiftOpenModal.tsx', 'utf-8');

if (!code.includes('import { useLanguage }')) {
    code = code.replace(
        "import { THEME } from '@/lib/theme';",
        "import { THEME } from '@/lib/theme';\nimport { useLanguage } from '@/lib/LanguageContext';"
    );
}

code = code.replace(
    /export default function ShiftOpenModal\(\{([^}]+)\}\:\s*ShiftOpenModalProps\)\s*\{/s,
    (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

const replacements = [
    ["<h2 style={{ color: '#1C73AB', margin: 0, fontWeight: 900, fontSize: '21px' }}>فتح وردية جديدة</h2>", "<h2 style={{ color: '#1C73AB', margin: 0, fontWeight: 900, fontSize: '21px' }}>{isEn ? 'Open New Shift' : 'فتح وردية جديدة'}</h2>"],
    ["تسجيل العهدة الافتتاحية وبدء تشغيل الصندوق", "{isEn ? 'Record opening cash and start register' : 'تسجيل العهدة الافتتاحية وبدء تشغيل الصندوق'}"],
    ["🏪 منفذ البيع / المستودع المراد فتح ورديته:", "🏪 {isEn ? 'Branch / Warehouse to open shift for:' : 'منفذ البيع / المستودع المراد فتح ورديته:'}"],
    ["<option value=\"\">-- اختر منفذ البيع --</option>", "<option value=\"\">{isEn ? '-- Select Branch --' : '-- اختر منفذ البيع --'}</option>"],
    ["{w.name} {hasOpen ? '🔴 (مشغول - به وردية نشطة)' : '🟢 (متاح لفتح وردية)'}", "{w.name} {hasOpen ? (isEn ? '🔴 (Busy - Active Shift)' : '🔴 (مشغول - به وردية نشطة)') : (isEn ? '🟢 (Available)' : '🟢 (متاح لفتح وردية)')}"],
    ["👤 المندوب / الكاشير المسؤول عن الوردية:", "👤 {isEn ? 'Cashier / Rep responsible for shift:' : 'المندوب / الكاشير المسؤول عن الوردية:'}"],
    ["<option value=\"\">مبيعات مباشرة (بدون مندوب)</option>", "<option value=\"\">{isEn ? 'Direct Sales (No Rep)' : 'مبيعات مباشرة (بدون مندوب)'}</option>"],
    ["{d.name} {hasOpen ? '🔴 (مسؤول عن وردية نشطة حالياً)' : '🟢 (متاح)'}", "{d.name} {hasOpen ? (isEn ? '🔴 (Has active shift)' : '🔴 (مسؤول عن وردية نشطة حالياً)') : (isEn ? '🟢 (Available)' : '🟢 (متاح)')}"],
    ["<span>المستودع قيد التشغيل بالفعل!</span>", "<span>{isEn ? 'Branch already running!' : 'المستودع قيد التشغيل بالفعل!'}</span>"],
    ["توجد حالياً وردية مفتوحة في <strong>{selectedWarehouse?.name}</strong> برقم <strong>#{String(existingWarehouseShift.id).slice(-6)}</strong>.", "{isEn ? 'There is currently an active shift in ' : 'توجد حالياً وردية مفتوحة في '}<strong>{selectedWarehouse?.name}</strong>{isEn ? ' ID: ' : ' برقم '}<strong>#{String(existingWarehouseShift.id).slice(-6)}</strong>."],
    ["المسؤول الحالي: <strong style={{ color: '#111827' }}>{(Array.isArray(existingWarehouseShift.delegate) ? existingWarehouseShift.delegate[0]?.name : (existingWarehouseShift.delegate as any)?.name) || 'مبيعات مباشرة'}</strong>.", "{isEn ? 'Current Cashier: ' : 'المسؤول الحالي: '}<strong style={{ color: '#111827' }}>{(Array.isArray(existingWarehouseShift.delegate) ? existingWarehouseShift.delegate[0]?.name : (existingWarehouseShift.delegate as any)?.name) || (isEn ? 'Direct Sales' : 'مبيعات مباشرة')}</strong>."],
    ["🔒 حماية النظام: المسؤول شخص واحد في المستودع ولا يمكن فتح ورديتين معاً في نفس الوقت. يجب إنهاء وتقفيل الوردية الحالية أولاً لبدء وردية جديدة.", "{isEn ? '🔒 System Protection: Only one active shift per branch is allowed. Please close the current shift first.' : '🔒 حماية النظام: المسؤول شخص واحد في المستودع ولا يمكن فتح ورديتين معاً في نفس الوقت. يجب إنهاء وتقفيل الوردية الحالية أولاً لبدء وردية جديدة.'}"],
    ["<span>المندوب مسؤول عن وردية نشطة في منفذ آخر!</span>", "<span>{isEn ? 'Rep has active shift in another branch!' : 'المندوب مسؤول عن وردية نشطة في منفذ آخر!'}</span>"],
    ["المندوب <strong>{selectedDelegate?.name}</strong> يدير حالياً وردية نشطة في <strong>{(Array.isArray(existingDelegateShift?.warehouse) ? existingDelegateShift?.warehouse[0]?.name : (existingDelegateShift?.warehouse as any)?.name) || 'منفذ آخر'}</strong>.", "{isEn ? 'Rep ' : 'المندوب '}<strong>{selectedDelegate?.name}</strong>{isEn ? ' is currently managing an active shift in ' : ' يدير حالياً وردية نشطة في '}<strong>{(Array.isArray(existingDelegateShift?.warehouse) ? existingDelegateShift?.warehouse[0]?.name : (existingDelegateShift?.warehouse as any)?.name) || (isEn ? 'another branch' : 'منفذ آخر')}</strong>."],
    ["المسؤول شخص واحد ولا يمكن الجمع بين ورديتين لنفس الشخص في نفس الوقت.", "{isEn ? 'A rep cannot manage two shifts simultaneously.' : 'المسؤول شخص واحد ولا يمكن الجمع بين ورديتين لنفس الشخص في نفس الوقت.'}"],
    ["<span>استئناف وردية اليوم لنفس المندوب</span>", "<span>{isEn ? 'Resume today\\'s shift for this rep' : 'استئناف وردية اليوم لنفس المندوب'}</span>"],
    ["توجد وردية أُغلقت اليوم لهذا المندوب في هذا المنفذ برقم <strong>#{todayClosedShift.shift_number || String(todayClosedShift.id).slice(-6)}</strong>.", "{isEn ? 'There is a closed shift today for this rep in this branch ID: ' : 'توجد وردية أُغلقت اليوم لهذا المندوب في هذا المنفذ برقم '}<strong>#{todayClosedShift.shift_number || String(todayClosedShift.id).slice(-6)}</strong>."],
    ["النقر أدناه سيقوم بـ <strong>استئناف نفس الوردية</strong> لتكملة مبيعات اليوم عليها دون فتح وردية مكررة.", "{isEn ? 'Clicking below will ' : 'النقر أدناه سيقوم بـ '}<strong>{isEn ? 'resume the same shift' : 'استئناف نفس الوردية'}</strong>{isEn ? ' to continue today\\'s sales.' : ' لتكملة مبيعات اليوم عليها دون فتح وردية مكررة.'}"],
    ["العهدة الافتتاحية (المبلغ بالدرج الآن بالريال):", "{isEn ? 'Opening Cash (Amount in register SAR):' : 'العهدة الافتتاحية (المبلغ بالدرج الآن بالريال):'}"],
    ["? (todayClosedShift ? '⏳ جاري استئناف الوردية...' : '⏳ جاري فتح الوردية...')", "? (todayClosedShift ? (isEn ? '⏳ Resuming shift...' : '⏳ جاري استئناف الوردية...') : (isEn ? '⏳ Opening shift...' : '⏳ جاري فتح الوردية...'))"],
    ["? '⛔ المستودع به وردية نشطة بالفعل'", "? (isEn ? '⛔ Branch has active shift' : '⛔ المستودع به وردية نشطة بالفعل')"],
    ["? '⛔ المندوب لديه وردية نشطة'", "? (isEn ? '⛔ Rep has active shift' : '⛔ المندوب لديه وردية نشطة')"],
    ["? '⚠️ اختر منفذ البيع'", "? (isEn ? '⚠️ Select Branch' : '⚠️ اختر منفذ البيع')"],
    ["? '🔄 استئناف وردية اليوم وتكملة المبيعات'", "? (isEn ? '🔄 Resume Shift' : '🔄 استئناف وردية اليوم وتكملة المبيعات')"],
    [": '✨ فتح الصندوق وبدء الوردية'", ": (isEn ? '✨ Open Shift & Start' : '✨ فتح الصندوق وبدء الوردية')"],
    ["إلغاء", "{isEn ? 'Cancel' : 'إلغاء'}"],
    ["throw new Error('يرجى تحديد منفذ البيع / المستودع أولاً');", "throw new Error(isEn ? 'Please select a branch first' : 'يرجى تحديد منفذ البيع / المستودع أولاً');"],
    ["showToast(isResumed ? (res?.message || 'تم استئناف وردية اليوم بنجاح وتكملة المبيعات عليها 🔄') : 'تم فتح الوردية بنجاح 🚀', 'success');", "showToast(isResumed ? (res?.message || (isEn ? 'Shift resumed successfully 🔄' : 'تم استئناف وردية اليوم بنجاح وتكملة المبيعات عليها 🔄')) : (isEn ? 'Shift opened successfully 🚀' : 'تم فتح الوردية بنجاح 🚀'), 'success');"]
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('app/pos/ShiftOpenModal.tsx', code);
console.log('ShiftOpenModal updated!');
