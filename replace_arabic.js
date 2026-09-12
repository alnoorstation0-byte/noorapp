const fs = require('fs');
let code = fs.readFileSync('app/pos/page.tsx', 'utf-8');

// 1. Add import
if (!code.includes('import { useLanguage }')) {
    code = code.replace(
        "import MasterPage from '@/components/MasterPage';",
        "import MasterPage from '@/components/MasterPage';\nimport { useLanguage } from '@/lib/LanguageContext';"
    );
}

// 2. Add language hooks
code = code.replace(
    /function PosItemNumpadModal\(\{([^}]+)\}\:\s*PosItemNumpadModalProps\)\s*\{/s,
    (match) => match + "\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

code = code.replace(
    "export default function PosPage() {",
    "export default function PosPage() {\n    const { language } = useLanguage();\n    const isEn = language === 'en';\n"
);

// 3. Replacements array
const replacements = [
    // PosItemNumpadModal
    ["الرصيد المتاح:", "{isEn ? 'Available:' : 'الرصيد المتاح:'}"],
    ["aria-label=\"إغلاق\"", "aria-label={isEn ? 'Close' : 'إغلاق'}"],
    ["{isExceeded ? '⚠️ تجاوز المخزون' : 'الكمية المطلوبة'}", "{isExceeded ? (isEn ? '⚠️ Stock Exceeded' : '⚠️ تجاوز المخزون') : (isEn ? 'Requested Qty' : 'الكمية المطلوبة')}"],
    ["{item.unit || 'حبة'}", "{item.unit || (isEn ? 'Pcs' : 'حبة')}"],
    ["{isTaxInclusive ? 'السعر (شامل الضريبة)' : 'السعر (قبل الضريبة)'}", "{isTaxInclusive ? (isEn ? 'Price (Tax Inc.)' : 'السعر (شامل الضريبة)') : (isEn ? 'Price (Tax Exc.)' : 'السعر (قبل الضريبة)')}"],
    ["ريال</", "{isEn ? 'SAR' : 'ريال'}</"],
    ["⛔ الكمية المطلوبة ({item.selected_qty}) تتجاوز الرصيد ({item.available_qty})!", "{isEn ? `⛔ Qty (${item.selected_qty}) exceeds stock (${item.available_qty})!` : `⛔ الكمية المطلوبة (${item.selected_qty}) تتجاوز الرصيد (${item.available_qty})!`}"],
    ["title=\"إنقاص الكمية 1\"", "title={isEn ? 'Decrease by 1' : 'إنقاص الكمية 1'}"],
    ["تعديل سريع", "{isEn ? 'Quick Edit' : 'تعديل سريع'}"],
    ["title=\"زيادة الكمية 1\"", "title={isEn ? 'Increase by 1' : 'زيادة الكمية 1'}"],
    [">إلغاء<", ">{isEn ? 'Cancel' : 'إلغاء'}<"],
    ["<span>⛔ تجاوز المخزون ({item.available_qty})</span>", "<span>{isEn ? `⛔ Stock Exceeded (${item.available_qty})` : `⛔ تجاوز المخزون (${item.available_qty})`}</span>"],
    ["<span>🛒 إضافة للسلة</span>", "<span>{isEn ? '🛒 Add to Cart' : '🛒 إضافة للسلة'}</span>"],
    ["<span>⌨️ لوحة المفاتيح: الأرقام للكمية | <strong style={{ color: '#1C73AB' }}>Enter</strong> للإضافة | <strong style={{ color: '#1C73AB' }}>Tab</strong> للتبديل | <strong style={{ color: '#1C73AB' }}>Esc</strong> للإلغاء</span>", "<span>{isEn ? '⌨️ Keyboard: Numbers for Qty | ' : '⌨️ لوحة المفاتيح: الأرقام للكمية | '}<strong style={{ color: '#1C73AB' }}>Enter</strong> {isEn ? 'to Add | ' : 'للإضافة | '}<strong style={{ color: '#1C73AB' }}>Tab</strong> {isEn ? 'to Switch | ' : 'للتبديل | '}<strong style={{ color: '#1C73AB' }}>Esc</strong> {isEn ? 'to Cancel' : 'للإلغاء'}</span>"],

    // MasterPage Header
    ["title=\"نقاط البيع (POS)\"", "title={isEn ? 'POS Cashier' : 'نقاط البيع (POS)'}"],
    ["subtitle=\"شاشة المبيعات السريعة (كاشير) من منافذ البيع\"", "subtitle={isEn ? 'Quick Sales & POS Register' : 'شاشة المبيعات السريعة (كاشير) من منافذ البيع'}"],

    // Top Header tags
    ["{logic.activeShift ? '🟢 الوردية الحالية نشطة' : '🔴 الوردية مغلقة حالياً'}", "{logic.activeShift ? (isEn ? '🟢 Shift Active' : '🟢 الوردية الحالية نشطة') : (isEn ? '🔴 Shift Closed' : '🔴 الوردية مغلقة حالياً')}"],
    ["{logic.activeShift?.warehouse_name || 'لا يوجد منفذ مرتبط'}", "{logic.activeShift?.warehouse_name || (isEn ? 'No linked branch' : 'لا يوجد منفذ مرتبط')}"],
    ["المندوب:", "{isEn ? 'Rep:' : 'المندوب:'}"],
    ["|| 'غير محدد'}", "|| (isEn ? 'Not selected' : 'غير محدد')}"],

    // Mobile tabs
    ["أصناف السلة 🛒", "{isEn ? 'Cart Items 🛒' : 'أصناف السلة 🛒'}"],
    ["إجمالي السلة 💰", "{isEn ? 'Cart Total 💰' : 'إجمالي السلة 💰'}"],

    // Top stats bar
    ["⚠️ أصناف قريبة من النفاد: {logic.lowStockCount}", "{isEn ? `⚠️ Low stock items: ${logic.lowStockCount}` : `⚠️ أصناف قريبة من النفاد: ${logic.lowStockCount}`}"],
    ["<span>فواتير المبيعات</span>", "<span>{isEn ? 'Sales Invoices' : 'فواتير المبيعات'}</span>"],
    ["<span>لوحة تحكم الورديات</span>", "<span>{isEn ? 'Shifts Dashboard' : 'لوحة تحكم الورديات'}</span>"],
    ["<span>إغلاق الوردية الحالية</span>", "<span>{isEn ? 'Close Current Shift' : 'إغلاق الوردية الحالية'}</span>"],
    ["<span>بدء وردية جديدة</span>", "<span>{isEn ? 'Start New Shift' : 'بدء وردية جديدة'}</span>"],

    // Controls Dropdowns
    ["🏪 منفذ البيع:", "🏪 {isEn ? 'Branch / POS:' : 'منفذ البيع:'}"],
    ["<option value=\"\" disabled>-- اختر منفذ البيع --</option>", "<option value=\"\" disabled>{isEn ? '-- Select Branch --' : '-- اختر منفذ البيع --'}</option>"],
    ["👤 المندوب / الكاشير:", "👤 {isEn ? 'Cashier / Rep:' : 'المندوب / الكاشير:'}"],
    ["<option value=\"\">-- اختر المندوب --</option>", "<option value=\"\">{isEn ? '-- Select Cashier --' : '-- اختر المندوب --'}</option>"],
    ["✅ {logic.isDelegateLocked ? 'حسابك المقترن' : 'تم التعيين'}", "✅ {logic.isDelegateLocked ? (isEn ? 'Your Account' : 'حسابك المقترن') : (isEn ? 'Assigned' : 'تم التعيين')}"],
    ["🚚 أمر التشغيل:", "🚚 {isEn ? 'Trip Dispatch:' : 'أمر التشغيل:'}"],
    ["مربوط تلقائياً ⚡", "{isEn ? 'Auto-linked ⚡' : 'مربوط تلقائياً ⚡'}"],
    
    // Shift Actions
    ["وردية نشطة", "{isEn ? 'Active Shift' : 'وردية نشطة'}"],
    ["title=\"مراجعة وتدقيق تفاصيل الوردية كمرجع\"", "title={isEn ? 'Review shift details' : 'مراجعة وتدقيق تفاصيل الوردية كمرجع'}"],
    ["🔍 تفاصيل الوردية", "🔍 {isEn ? 'Shift Details' : 'تفاصيل الوردية'}"],
    ["🔒 إغلاق الوردية", "🔒 {isEn ? 'Close Shift' : 'إغلاق الوردية'}"],
    ["لا توجد وردية مفتوحة", "{isEn ? 'No Open Shift' : 'لا توجد وردية مفتوحة'}"],
    ["|| 'اختر منفذ البيع'}", "|| (isEn ? 'Select Branch' : 'اختر منفذ البيع')}"],
    ["✨ فتح وردية جديدة", "✨ {isEn ? 'Open New Shift' : 'فتح وردية جديدة'}"],
    ["title=\"عرض ورديات كل المناديب والمستودعات والتبديل بينها\"", "title={isEn ? 'View all open shifts across branches' : 'عرض ورديات كل المناديب والمستودعات والتبديل بينها'}"],
    ["📋 الورديات النشطة", "📋 {isEn ? 'Active Shifts' : 'الورديات النشطة'}"],

    // Mobile tabs switcher
    ["<span>قائمة الأصناف</span>", "<span>{isEn ? 'Products List' : 'قائمة الأصناف'}</span>"],
    ["<span>الفاتورة الحالية</span>", "<span>{isEn ? 'Current Invoice' : 'الفاتورة الحالية'}</span>"],

    // Loading & Empty states
    ["message=\"جاري تحضير شاشة الكاشير...\"", "message={isEn ? 'Preparing POS interface...' : 'جاري تحضير شاشة الكاشير...'}"],
    ["الوردية مغلقة حالياً — لا يمكن إجراء أي عملية بيع", "{isEn ? 'Shift is currently closed — Sales are disabled' : 'الوردية مغلقة حالياً — لا يمكن إجراء أي عملية بيع'}"],
    ["يجب على المندوب أو البائع الضغط على \"بدء الوردية\" لتسجيل العهدة وتفعيل نقطة البيع", "{isEn ? 'The cashier must click \"Open New Shift\" to declare starting cash and activate POS.' : 'يجب على المندوب أو البائع الضغط على \"بدء الوردية\" لتسجيل العهدة وتفعيل نقطة البيع'}"],
    ["<span>بدء الوردية الآن</span>", "<span>{isEn ? 'Open Shift Now' : 'بدء الوردية الآن'}</span>"],

    // Inventory & Low stock
    ["<span>تنبيه: يوجد <strong>{logic.lowStockCount}</strong> صنف وصل لحد إعادة الطلب في هذا المنفذ!</span>", "<span>{isEn ? 'Alert: There are ' : 'تنبيه: يوجد '}<strong>{logic.lowStockCount}</strong>{isEn ? ' items below reorder level in this branch!' : ' صنف وصل لحد إعادة الطلب في هذا المنفذ!'}</span>"],
    ["{logic.onlyLowStock ? 'عرض كل الأصناف' : 'تصفية النواقص فقط 🔍'}", "{logic.onlyLowStock ? (isEn ? 'Show All Items' : 'عرض كل الأصناف') : (isEn ? 'Filter Low Stock 🔍' : 'تصفية النواقص فقط 🔍')}"],
    ["placeholder=\"ابحث عن صنف بالاسم... (اضغط Enter للاختيار السريع)\"", "placeholder={isEn ? 'Search item by name... (Press Enter for quick select)' : 'ابحث عن صنف بالاسم... (اضغط Enter للاختيار السريع)'}"],
    ["{logic.onlyLowStock ? 'لا توجد أصناف تحت حد الطلب حالياً 🎉' : 'لا توجد أصناف متاحة في هذا المنفذ حالياً'}", "{logic.onlyLowStock ? (isEn ? 'No low stock items 🎉' : 'لا توجد أصناف تحت حد الطلب حالياً 🎉') : (isEn ? 'No items available in this branch currently' : 'لا توجد أصناف متاحة في هذا المنفذ حالياً')}"],
    ["⚠️ حد الطلب", "⚠️ {isEn ? 'Reorder Level' : 'حد الطلب'}"],
    ["⚡ قارب على النفاد", "⚡ {isEn ? 'Low Stock' : 'قارب على النفاد'}"],
    ["المتاح:", "{isEn ? 'Available:' : 'المتاح:'}"],

    // Cart / Invoice
    ["أصناف</", "{isEn ? 'Items' : 'أصناف'}</"],
    ["if (window.confirm('هل تريد بالتأكيد إفراغ السلة الحالية؟')) {", "if (window.confirm(isEn ? 'Are you sure you want to clear the current cart?' : 'هل تريد بالتأكيد إفراغ السلة الحالية؟')) {"],
    ["title=\"إفراغ الفاتورة\"", "title={isEn ? 'Clear Invoice' : 'إفراغ الفاتورة'}"],
    ["🗑️ إفراغ", "🗑️ {isEn ? 'Clear' : 'إفراغ'}"],
    ["السلة فارغة حالياً", "{isEn ? 'Cart is currently empty' : 'السلة فارغة حالياً'}"],
    ["انقر على الأصناف من القائمة لإضافتها للفاتورة", "{isEn ? 'Click on items from the list to add to invoice' : 'انقر على الأصناف من القائمة لإضافتها للفاتورة'}"],
    ["👈 الذهاب لقائمة الأصناف", "👈 {isEn ? 'Go to Products List' : 'الذهاب لقائمة الأصناف'}"],
    ["فوارغ)", "{isEn ? 'returnable' : 'فوارغ'})"],
    ["خصم:", "{isEn ? 'Discount:' : 'خصم:'}"],
    ["title=\"حذف من الفاتورة\"", "title={isEn ? 'Remove from invoice' : 'حذف من الفاتورة'}"],
    ["title=\"إنقاص الكمية\"", "title={isEn ? 'Decrease Qty' : 'إنقاص الكمية'}"],
    ["title=\"زيادة الكمية\"", "title={isEn ? 'Increase Qty' : 'زيادة الكمية'}"],
    ["<span className=\"cart-price-label\">السعر:</span>", "<span className=\"cart-price-label\">{isEn ? 'Price:' : 'السعر:'}</span>"],
    ["<span className=\"cart-currency-badge\">ر.س</span>", "<span className=\"cart-currency-badge\">{isEn ? 'SAR' : 'ر.س'}</span>"],
    ["<span className=\"cart-total-label\">الصافي:</span>", "<span className=\"cart-total-label\">{isEn ? 'Net:' : 'الصافي:'}</span>"],
    
    // Checkout section
    ["👤 العميل:", "👤 {isEn ? 'Customer:' : 'العميل:'}"],
    ["<option value=\"\">عميل نقدي (بدون اسم)</option>", "<option value=\"\">{isEn ? 'Walk-in Customer (Cash)' : 'عميل نقدي (بدون اسم)'}</option>"],
    ["💳 طريقة الدفع:", "💳 {isEn ? 'Payment Method:' : 'طريقة الدفع:'}"],
    ["<option value=\"نقدي (كاش)\">نقدي (كاش)</option>", "<option value=\"نقدي (كاش)\">{isEn ? 'Cash' : 'نقدي (كاش)'}</option>"],
    ["<option value=\"شبكة (مدى)\">شبكة (مدى / بطاقة)</option>", "<option value=\"شبكة (مدى)\">{isEn ? 'Card / POS' : 'شبكة (مدى / بطاقة)'}</option>"],
    ["<option value=\"آجل\">آجل (على الحساب)</option>", "<option value=\"آجل\">{isEn ? 'Credit (On Account)' : 'آجل (على الحساب)'}</option>"],
    ["خصم إضافي:", "{isEn ? 'Extra Discount:' : 'خصم إضافي:'}"],
    ["<option value=\"amount\">ر.س</option>", "<option value=\"amount\">{isEn ? 'SAR' : 'ر.س'}</option>"],
    ["طريقة الحساب:", "{isEn ? 'Calc Method:' : 'طريقة الحساب:'}"],
    ["شامل الضريبة", "{isEn ? 'Tax Inclusive' : 'شامل الضريبة'}"],
    ["غير شامل", "{isEn ? 'Tax Exclusive' : 'غير شامل'}"],
    ["المجموع الفرعي:", "{isEn ? 'Subtotal:' : 'المجموع الفرعي:'}"],
    ["الضريبة (15%):", "{isEn ? 'VAT (15%):' : 'الضريبة (15%):'}"],
    ["الإجمالي المطلوب:", "{isEn ? 'Grand Total:' : 'الإجمالي المطلوب:'}"],
    ["عهدة فوارغ مستحقة:", "{isEn ? 'Returnables Custody:' : 'عهدة فوارغ مستحقة:'}"],
    ["عبوة", "{isEn ? 'Bottles' : 'عبوة'}"],
    ["اضغط لبدء الوردية أولاً لإتمام البيع", "{isEn ? 'Open shift first to process sale' : 'اضغط لبدء الوردية أولاً لإتمام البيع'}"],
    ["<span>{logic.isCheckingOut ? 'جاري إصدار الفاتورة...' : 'الدفع وإصدار الفاتورة'}</span>", "<span>{logic.isCheckingOut ? (isEn ? 'Issuing Invoice...' : 'جاري إصدار الفاتورة...') : (isEn ? 'Checkout & Print' : 'الدفع وإصدار الفاتورة')}</span>"],
    ["السلة ({logic.cart.length} أصناف)", "{isEn ? `Cart (${logic.cart.length} Items)` : `السلة (${logic.cart.length} أصناف)`}"],
    ["الإجمالي:", "{isEn ? 'Total:' : 'الإجمالي:'}"],
    ["<span>إتمام الطلب</span>", "<span>{isEn ? 'Checkout' : 'إتمام الطلب'}</span>"]
];

for (const [search, replace] of replacements) {
    code = code.split(search).join(replace);
}

fs.writeFileSync('app/pos/page.tsx', code);
console.log('Replacements completed successfully.');
