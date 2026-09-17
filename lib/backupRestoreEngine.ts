"use client";
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseData } from '@/lib/helpers';

// =========================================================================
// 🗺️ تعريف الجداول وتسمياتها العربية المعتمدة وتصنيفها
// =========================================================================
export interface TableMeta {
    id: string;
    name: string;
    group: string;
    isMaster: boolean;
    columns: string[];
    labels: Record<string, string>;
}

export const SYSTEM_TABLES: TableMeta[] = [
    // 1. المبيعات ونقاط البيع والتشغيل
    {
        id: 'invoices',
        name: 'فواتير مبيعات الوقود ونقاط البيع',
        group: '🛒 المبيعات والتشغيل',
        isMaster: false,
        columns: ['id', 'invoice_number', 'date', 'partner_id', 'client_name', 'total_amount', 'taxable_amount', 'tax_amount', 'payment_method', 'paid_amount', 'status', 'warehouse_id', 'delegate_id', 'lines_data', 'shift_id', 'created_at'],
        labels: {
            id: 'معرف الفاتورة',
            invoice_number: 'رقم الفاتورة (Invoice No)',
            date: 'تاريخ الإصدار (Date)',
            client_name: 'اسم العميل / المركبة (Customer)',
            total_amount: 'الإجمالي شامل الضريبة (Total)',
            taxable_amount: 'الخاضع للضريبة (Subtotal)',
            tax_amount: 'ضريبة 15% (VAT)',
            payment_method: 'طريقة الدفع (Payment Method)',
            paid_amount: 'المبلغ المسدد (Paid)',
            status: 'حالة الفاتورة (Status)',
            lines_data: 'تفاصيل الأصناف والوقود المباع (Items Summary)',
            warehouse_id: 'معرف الخزان/المستودع',
            delegate_id: 'معرف المشغل/الكاشير',
            shift_id: 'معرف الوردية',
            created_at: 'وقت الإنشاء'
        }
    },
    {
        id: 'pos_shifts',
        name: 'ورديات نقاط بيع ومضخات الوقود',
        group: '🛒 المبيعات والتشغيل',
        isMaster: false,
        columns: ['id', 'opened_at', 'closed_at', 'warehouse_id', 'delegate_id', 'user_id', 'starting_cash', 'total_sales', 'total_cash_sales', 'total_card_sales', 'total_credit_sales', 'total_liters_sold', 'meter_total_amount', 'meter_sales_variance', 'total_expenses', 'expected_cash', 'actual_cash', 'shortage_overage', 'status'],
        labels: {
            id: 'رقم الوردية (Shift ID)',
            opened_at: 'وقت الفتح (Opened At)',
            closed_at: 'وقت الإغلاق (Closed At)',
            starting_cash: 'عهدة الافتتاح (Starting Cash)',
            total_sales: 'إجمالي المبيعات (Total Sales)',
            total_cash_sales: 'مبيعات الكاش (Cash Sales)',
            total_card_sales: 'مبيعات الشبكة (Card Sales)',
            total_credit_sales: 'مبيعات الآجل (Credit Sales)',
            total_liters_sold: 'إجمالي اللترات المباعة (Total Liters)',
            meter_total_amount: 'إجمالي مبيعات العدادات (Meters Total)',
            meter_sales_variance: 'فروقات العدادات (Meters Variance)',
            total_expenses: 'المصروفات (Expenses)',
            expected_cash: 'النقدية المتوقعة (Expected Cash)',
            actual_cash: 'النقدية الفعلية (Actual Cash)',
            shortage_overage: 'العجز / الزيادة (Shortage/Overage)',
            status: 'حالة الوردية (Status)',
            warehouse_id: 'معرف المستودع/الخزان',
            delegate_id: 'معرف مشغل المحطة'
        }
    },
    {
        id: 'receipt_vouchers',
        name: 'سندات القبض والتحصيل',
        group: '🛒 المبيعات والتشغيل',
        isMaster: false,
        columns: ['id', 'receipt_number', 'date', 'amount', 'partner_id', 'payment_method', 'invoice_id', 'notes', 'status', 'safe_bank_acc_id', 'delegate_id', 'shift_id', 'created_at'],
        labels: {
            id: 'معرف السند',
            receipt_number: 'رقم السند (Receipt No)',
            date: 'التاريخ (Date)',
            amount: 'المبلغ المحصل (Amount)',
            payment_method: 'طريقة الدفع (Payment Method)',
            notes: 'البيان / ملاحظات (Notes)',
            status: 'الحالة (Status)',
            partner_id: 'معرف العميل',
            invoice_id: 'معرف الفاتورة المرتبطة',
            safe_bank_acc_id: 'حساب الخزينة/البنك',
            delegate_id: 'مشغل المحطة / المحصل',
            created_at: 'وقت الإنشاء'
        }
    },
    {
        id: 'fuel_pumps',
        name: 'مضخات وطلمبات الوقود',
        group: '🛒 المبيعات والتشغيل',
        isMaster: true,
        columns: ['id', 'pump_number', 'pump_name', 'fuel_type', 'unit_price', 'current_meter', 'warehouse_id', 'is_active', 'created_at'],
        labels: {
            id: 'معرف المضخة',
            pump_number: 'رقم المضخة (Pump No)',
            pump_name: 'اسم المضخة (Pump Name)',
            fuel_type: 'نوع الوقود (91 / 95 / ديزل)',
            unit_price: 'سعر اللتر الرسمي',
            current_meter: 'العداد التراكمي الحالي (Liters)',
            warehouse_id: 'الخزان المغذي',
            is_active: 'حالة التشغيل (Active)',
            created_at: 'تاريخ الإضافة'
        }
    },
    {
        id: 'shift_pump_readings',
        name: 'قراءات عدادات المضخات للورديات',
        group: '🛒 المبيعات والتشغيل',
        isMaster: false,
        columns: ['id', 'shift_id', 'pump_id', 'start_reading', 'end_reading', 'liters_pumped', 'unit_price', 'expected_amount', 'variance_liters', 'notes'],
        labels: {
            id: 'معرف القراءة',
            shift_id: 'معرف الوردية',
            pump_id: 'معرف المضخة',
            start_reading: 'قراءة بداية الوردية',
            end_reading: 'قراءة نهاية الوردية',
            liters_pumped: 'اللترات المنصرفة فعلياً',
            unit_price: 'سعر اللتر',
            expected_amount: 'المبيعات المتوقعة من العداد',
            variance_liters: 'فروق اللترات',
            notes: 'ملاحظات'
        }
    },

    // 2. المالية والحسابات العامة
    {
        id: 'accounts',
        name: 'دليل شجرة الحسابات',
        group: '💰 المالية والمحاسبة',
        isMaster: true,
        columns: ['id', 'code', 'name', 'account_type', 'parent_id', 'is_transactional', 'created_at'],
        labels: {
            id: 'معرف الحساب',
            code: 'رمز الحساب (Code)',
            name: 'اسم الحساب (Account Name)',
            account_type: 'نوع الحساب (Account Type)',
            parent_id: 'معرف الحساب الأب',
            is_transactional: 'يقبل قيود (Transactional)',
            created_at: 'تاريخ الإنشاء'
        }
    },
    {
        id: 'expenses',
        name: 'المصروفات العامة والتشغيلية',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'expense_number', 'exp_date', 'main_category', 'description', 'total_price', 'vat_amount', 'paid_amount', 'payment_method', 'payee_name', 'status', 'creditor_account', 'payment_account', 'shift_id', 'notes', 'created_at'],
        labels: {
            id: 'معرف المصروف',
            expense_number: 'رقم المصروف (Expense No)',
            exp_date: 'التاريخ (Date)',
            main_category: 'التصنيف الرئيسي (Category)',
            description: 'البيان / الوصف (Description)',
            total_price: 'المبلغ الإجمالي (Total Price)',
            vat_amount: 'الضريبة (VAT)',
            paid_amount: 'المبلغ المدفوع (Paid)',
            payment_method: 'طريقة الدفع (Payment Method)',
            payee_name: 'المستفيد / المورد (Payee)',
            status: 'حالة الاعتماد (Status)',
            notes: 'ملاحظات',
            created_at: 'وقت التسجيل'
        }
    },
    {
        id: 'payment_vouchers',
        name: 'سندات الصرف',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'voucher_number', 'date', 'amount', 'partner_id', 'payment_method', 'description', 'notes', 'status', 'debit_account_id', 'credit_account_id', 'created_at'],
        labels: {
            id: 'معرف السند',
            voucher_number: 'رقم السند (Voucher No)',
            date: 'التاريخ (Date)',
            amount: 'المبلغ المنصرف (Amount)',
            payment_method: 'طريقة الصرف (Payment Method)',
            description: 'البيان (Description)',
            notes: 'ملاحظات',
            status: 'الحالة (Status)',
            partner_id: 'معرف المستفيد',
            created_at: 'وقت الإنشاء'
        }
    },
    {
        id: 'journal_headers',
        name: 'رؤوس القيود اليومية',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'entry_date', 'description', 'status', 'v_type', 'reference_id', 'created_at'],
        labels: {
            id: 'معرف القيد',
            entry_date: 'تاريخ القيد (Date)',
            description: 'شرح القيد (Description)',
            status: 'حالة الترحيل (Status)',
            v_type: 'نوع الحركة (Type)',
            reference_id: 'المرجع المرتبط',
            created_at: 'وقت القيد'
        }
    },
    {
        id: 'journal_lines',
        name: 'تفاصيل وخطوط القيود المحاسبية',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'header_id', 'account_id', 'partner_id', 'debit', 'credit', 'notes', 'tax_amount', 'tax_rate', 'created_at'],
        labels: {
            id: 'معرف السطر',
            header_id: 'معرف رأس القيد',
            account_id: 'معرف الحساب المالي',
            partner_id: 'معرف الشريك المرتبط',
            debit: 'مدين (Debit)',
            credit: 'دائن (Credit)',
            notes: 'شرح السطر (Notes)',
            tax_amount: 'مبلغ الضريبة',
            created_at: 'وقت الإنشاء'
        }
    },
    {
        id: 'manual_journals',
        name: 'القيود اليومية اليدوية والتسويات',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'voucher_number', 'entry_date', 'description', 'amount', 'status', 'debit_account_id', 'credit_account_id', 'partner_id', 'created_at'],
        labels: {
            id: 'معرف القيد اليدوي',
            voucher_number: 'رقم السند (Voucher No)',
            entry_date: 'التاريخ (Date)',
            description: 'البيان (Description)',
            amount: 'المبلغ (Amount)',
            status: 'الحالة (Status)',
            debit_account_id: 'حساب المدين',
            credit_account_id: 'حساب الدائن'
        }
    },
    {
        id: 'cash_flows',
        name: 'سجل حركات السيولة والتدفق النقدي',
        group: '💰 المالية والمحاسبة',
        isMaster: false,
        columns: ['id', 'transaction_date', 'flow_type', 'amount', 'category', 'payment_method', 'description', 'account_id', 'partner_id', 'created_at'],
        labels: {
            id: 'معرف الحركة',
            transaction_date: 'التاريخ (Date)',
            flow_type: 'نوع التدفق (Inflow/Outflow)',
            amount: 'المبلغ (Amount)',
            category: 'التصنيف (Category)',
            payment_method: 'طريقة الدفع',
            description: 'البيان (Description)'
        }
    },

    // 3. المخزون وخزانات الوقود والمستودعات
    {
        id: 'inventory_items',
        name: 'كتالوج أصناف الوقود والزيوت والمبيعات',
        group: '📦 المخزون وخزانات الوقود',
        isMaster: true,
        columns: ['id', 'code', 'name', 'category', 'fuel_type', 'unit', 'default_price', 'suggested_price', 'cost_price', 'current_quantity', 'reorder_level', 'is_active', 'created_at'],
        labels: {
            id: 'معرف الصنف',
            code: 'كود الصنف (Item Code)',
            name: 'اسم الصنف (Item Name)',
            category: 'التصنيف (وقود / زيوت / تموينات / خدمات)',
            fuel_type: 'نوع الوقود (91 / 95 / ديزل)',
            unit: 'الوحدة (لتر / حبة / علبة)',
            default_price: 'سعر البيع (Default Price)',
            suggested_price: 'السعر المقترح',
            cost_price: 'سعر التكلفة (Cost Price)',
            current_quantity: 'الرصيد المتاح (Current Qty)',
            reorder_level: 'حد إعادة الطلب (Reorder Level)',
            is_active: 'نشط (Active)',
            created_at: 'تاريخ الإضافة'
        }
    },
    {
        id: 'warehouses',
        name: 'خزانات الوقود ومستودعات التموينات',
        group: '📦 المخزون وخزانات الوقود',
        isMaster: true,
        columns: ['id', 'name', 'type', 'fuel_type', 'tank_capacity_liters', 'is_active', 'delegate_id', 'phone', 'location', 'description', 'created_at'],
        labels: {
            id: 'معرف الخزان/المستودع',
            name: 'اسم الخزان / المستودع (Name)',
            type: 'النوع (خزان وقود / تموينات / رئيسي)',
            fuel_type: 'نوع الوقود المخزن',
            tank_capacity_liters: 'السعة القصوى باللترات',
            is_active: 'نشط (Active)',
            delegate_id: 'المشرف المسؤول',
            phone: 'رقم الهاتف',
            location: 'الموقع'
        }
    },
    {
        id: 'warehouse_inventory',
        name: 'أرصدة المخزون بالخزانات والمستودعات',
        group: '📦 المخزون وخزانات الوقود',
        isMaster: false,
        columns: ['id', 'warehouse_id', 'item_id', 'quantity', 'updated_at'],
        labels: {
            id: 'المعرف',
            warehouse_id: 'معرف الخزان/المستودع',
            item_id: 'معرف الصنف/الوقود',
            quantity: 'الكمية المتوفرة (Quantity)',
            updated_at: 'تاريخ آخر تحديث'
        }
    },
    {
        id: 'inventory_transactions',
        name: 'سجل حركات توريد وصرف الوقود والمخزون',
        group: '📦 المخزون وخزانات الوقود',
        isMaster: false,
        columns: ['id', 'transaction_number', 'transaction_date', 'type', 'quantity', 'item_id', 'warehouse_id', 'unit_price', 'total_price', 'status', 'invoice_id', 'shift_id', 'notes', 'created_at'],
        labels: {
            id: 'معرف الحركة',
            transaction_number: 'رقم الحركة (Tx Number)',
            transaction_date: 'التاريخ (Date)',
            type: 'نوع الحركة (توريد صهريج / بيع / تحويل)',
            quantity: 'الكمية (Quantity)',
            unit_price: 'سعر الوحدة (Unit Price)',
            total_price: 'الإجمالي (Total)',
            status: 'الحالة (Status)',
            notes: 'ملاحظات'
        }
    },

    // 4. الشركاء والعملاء والموارد البشرية
    {
        id: 'partners',
        name: 'دليل الشركاء (عملاء، شركات النقل، موردو الوقود، موظفون)',
        group: '👥 الشركاء والموارد البشرية',
        isMaster: true,
        columns: ['id', 'code', 'name', 'partner_type', 'phone', 'vat_number', 'address', 'credit_limit', 'credit_days', 'is_active', 'created_at'],
        labels: {
            id: 'معرف الشريك',
            code: 'كود الشريك (Code)',
            name: 'اسم الشريك / العميل / المورد (Name)',
            partner_type: 'نوع الشريك (عميل / مورد وقود / ناقل / موظف)',
            phone: 'رقم الهاتف (Phone)',
            vat_number: 'الرقم الضريبي (VAT No)',
            address: 'العنوان (Address)',
            credit_limit: 'حد الائتمان (Credit Limit)',
            credit_days: 'فترة السداد بالأيام (Credit Days)',
            is_active: 'نشط (Active)'
        }
    },
    {
        id: 'payroll_slips',
        name: 'مسيرات رواتب الموظفين',
        group: '👥 الشركاء والموارد البشرية',
        isMaster: false,
        columns: ['id', 'emp_id', 'month', 'basic_salary', 'allowances', 'total_advances', 'total_deductions', 'net_salary', 'amount_to_pay', 'status', 'created_at'],
        labels: {
            id: 'معرف المسير',
            emp_id: 'معرف الموظف',
            month: 'الشهر (Month)',
            basic_salary: 'الراتب الأساسي (Basic Salary)',
            allowances: 'البدلات (Allowances)',
            total_advances: 'السلف (Advances)',
            total_deductions: 'الخصومات (Deductions)',
            net_salary: 'صافي الراتب (Net Salary)',
            amount_to_pay: 'المستحق للصرف',
            status: 'الحالة (Status)'
        }
    },
    {
        id: 'profiles',
        name: 'حسابات وصلاحيات المستخدمين',
        group: '⚙️ إعدادات النظام',
        isMaster: true,
        columns: ['id', 'username', 'full_name', 'email', 'role', 'phone_number', 'is_admin', 'is_active', 'created_at'],
        labels: {
            id: 'معرف المستخدم',
            username: 'اسم المستخدم (Username)',
            full_name: 'الاسم الكامل (Full Name)',
            email: 'البريد الإلكتروني (Email)',
            role: 'الدور الوظيفي (Role)',
            phone_number: 'رقم الهاتف (Phone)',
            is_admin: 'مدير نظام (Admin)',
            is_active: 'الحساب نشط (Active)'
        }
    },
    {
        id: 'system_settings',
        name: 'إعدادات النظام العامة',
        group: '⚙️ إعدادات النظام',
        isMaster: true,
        columns: ['id', 'theme_config', 'privacy_settings', 'notifications', 'updated_at'],
        labels: {
            id: 'المعرف',
            theme_config: 'إعدادات المظهر',
            privacy_settings: 'إعدادات الخصوصية',
            updated_at: 'تاريخ التحديث'
        }
    }
];

// ترتيب التبعيات عند الاستعادة (الآباء أولاً لمنع أخطاء Foreign Keys)
export const RESTORE_DEPENDENCY_ORDER = [
    'accounts',
    'partners',
    'warehouses',
    'inventory_items',
    'fuel_pumps',
    'warehouse_inventory',
    'pos_shifts',
    'shift_pump_readings',
    'invoices',
    'receipt_vouchers',
    'payment_vouchers',
    'expenses',
    'journal_headers',
    'journal_lines',
    'manual_journals',
    'inventory_transactions',
    'cash_flows',
    'payroll_slips',
    'profiles',
    'system_settings'
];

// ترتيب الحذف عند مسح الحركات والقيود (الأبناء أولاً لمنع أخطاء Foreign Keys)
export const CLEAR_TRANSACTIONS_ORDER = [
    'shift_pump_readings',
    'inventory_transactions',
    'journal_lines',
    'journal_headers',
    'manual_journals',
    'receipt_vouchers',
    'payment_vouchers',
    'expenses',
    'invoices',
    'cash_flows',
    'pos_shifts'
];

// =========================================================================
// 1️⃣ تصدير إكسل احترافي ومقروء كتقرير شامل (Professional Multi-Sheet Excel)
// =========================================================================
export async function exportToProfessionalExcel(
    selectedTableIds: string[], 
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!selectedTableIds || selectedTableIds.length === 0) {
            throw new Error("لم يتم تحديد أي جداول للتصدير!");
        }

        onProgress?.('⏳ جاري جلب البيانات من النظام...');
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();
        const exportTimestamp = new Date().toLocaleString('ar-SA');

        for (const tableId of selectedTableIds) {
            const tableMeta = SYSTEM_TABLES.find(t => t.id === tableId) || {
                id: tableId,
                name: tableId,
                group: 'عام',
                isMaster: false,
                columns: ['id'],
                labels: {}
            };

            onProgress?.(`⏳ جاري معالجة جدول: ${tableMeta.name}...`);
            const data = await fetchAllSupabaseData(supabase, tableId);
            const columns = tableMeta.columns;

            // بناء رأس التقرير الاحترافي
            const sheetRows: any[][] = [];

            // سطر 1: البانر الرئيسي للشعار والشركة
            sheetRows.push([`💧 محطات النور للوقود | Al-Noor Gas Stations Gas Station - تقرير: ${tableMeta.name}`]);
            // سطر 2: الميتا داتا والتاريخ
            sheetRows.push([`تاريخ التصدير: ${exportTimestamp} | إجمالي السجلات: ${data?.length || 0} | كود الجدول البرمجي: ${tableId}`]);
            // سطر 3: فاصل فارغ
            sheetRows.push([]);

            // سطر 4: عناوين الأعمدة باللغة العربية مع المصطلح الإنجليزي
            const headerRow = columns.map(col => tableMeta.labels[col] || col);
            sheetRows.push(headerRow);

            // أسطر البيانات
            const colSums: Record<number, number> = {};

            if (data && data.length > 0) {
                data.forEach(row => {
                    const rowData = columns.map((col, cIdx) => {
                        const val = row[col];
                        if (val === null || val === undefined) return '';
                        
                        // معالجة JSON مثل lines_data
                        if (typeof val === 'object') {
                            if (Array.isArray(val)) {
                                return val.map((it: any) => {
                                    if (typeof it === 'object') {
                                        return `${it.name || it.item_name || 'صنف'} (كمية: ${it.quantity || it.qty || 1} | سعر: ${it.unit_price || it.price || 0})`;
                                    }
                                    return String(it);
                                }).join('  ||  ');
                            }
                            return JSON.stringify(val);
                        }

                        // تجميع القيم المالية في مصفوفة المجاميع
                        if (typeof val === 'number') {
                            colSums[cIdx] = (colSums[cIdx] || 0) + val;
                            return val;
                        }

                        return String(val);
                    });
                    sheetRows.push(rowData);
                });

                // سطر المجموع النهائي في أسفل الجدول للأرقام المالية
                const hasNumericTotals = Object.keys(colSums).length > 0;
                if (hasNumericTotals) {
                    const totalRow = columns.map((col, cIdx) => {
                        if (cIdx === 0) return 'الإجمالي العام (Total Summary)';
                        if (colSums[cIdx] !== undefined) {
                            return Number(colSums[cIdx].toFixed(2));
                        }
                        return '';
                    });
                    sheetRows.push(totalRow);
                }
            } else {
                sheetRows.push(['لا توجد سجلات حالياً في هذا الجدول']);
            }

            const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

            // ضبط اتجاه الشيت من اليمين لليسار (RTL) للعربية
            worksheet['!views'] = [{ rightToLeft: true }];

            // دمج سطر العنوان الأول عبر كافة الأعمدة
            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(columns.length - 1, 1) } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(columns.length - 1, 1) } }
            ];

            // حساب العرض التلقائي لكل عمود (Auto Width) لمنع تقطيع النصوص
            const colWidths = columns.map((col, cIdx) => {
                let maxLen = (tableMeta.labels[col] || col).length;
                for (let r = 3; r < sheetRows.length; r++) {
                    const cellVal = sheetRows[r]?.[cIdx];
                    if (cellVal !== undefined && cellVal !== null) {
                        const strLen = String(cellVal).length;
                        if (strLen > maxLen) maxLen = Math.min(strLen, 60);
                    }
                }
                return { wch: Math.max(maxLen + 4, 14) };
            });
            worksheet['!cols'] = colWidths;

            // اسم الشيت (مقتضب بالعربية ليناسب شروط Excel ألا يتجاوز 31 حرفاً)
            const safeSheetName = tableMeta.name.split('(')[0].replace(/[\\/\\?\\*\\]\\[]/g, '').trim().substring(0, 30);
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
        }

        const fileName = `Al-Noor Gas Stations_ERP_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        onProgress?.('✅ تم تصدير ملف الإكسل الشامل بنجاح!');
        return { success: true };
    } catch (err: any) {
        console.error("Excel Export Error:", err);
        return { success: false, error: err.message };
    }
}

// =========================================================================
// 2️⃣ تصدير نسخة احتياطية بصيغة SQL كاملة (PostgreSQL Compatible Dump)
// =========================================================================
export async function exportToSQL(
    selectedTableIds: string[], 
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!selectedTableIds || selectedTableIds.length === 0) {
            throw new Error("لم يتم تحديد أي جداول للتصدير!");
        }

        onProgress?.('⏳ جاري إعداد وتوليد سكريبت SQL...');
        
        // ترتيب الجداول حسب التبعيات
        const sortedTables = RESTORE_DEPENDENCY_ORDER.filter(t => selectedTableIds.includes(t));
        // إضافة أي جداول محددة لم تكن في القائمة
        selectedTableIds.forEach(t => {
            if (!sortedTables.includes(t)) sortedTables.push(t);
        });

        let sqlContent = 
`-- =========================================================================
-- Al-Noor Gas Stations Station ERP Database Backup (PostgreSQL Format)
-- Generated at: ${new Date().toISOString()}
-- Company: محطات النور للوقود | Al-Noor Gas Stations Gas Station
-- =========================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

BEGIN;
`;

        for (const tableId of sortedTables) {
            const tableMeta = SYSTEM_TABLES.find(t => t.id === tableId) || {
                id: tableId,
                name: tableId,
                columns: ['id']
            };

            onProgress?.(`⏳ جاري كتابة جمل SQL لجدول: ${tableMeta.name}...`);
            const data = await fetchAllSupabaseData(supabase, tableId);
            
            if (data && data.length > 0) {
                const cols = Object.keys(data[0]);
                const colsStr = cols.map(c => `"${c}"`).join(', ');

                sqlContent += `
-- -------------------------------------------------------------------------
-- Table: ${tableId} (${tableMeta.name}) - Records: ${data.length}
-- -------------------------------------------------------------------------
`;

                // تجزئة الداتا على دفعات (50 صف في كل INSERT) لتفادي الأسطر العملاقة
                const chunkSize = 50;
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    const valueTuples = chunk.map(row => {
                        const vals = cols.map(c => {
                            const v = row[c];
                            if (v === null || v === undefined) return 'NULL';
                            if (typeof v === 'boolean') return v ? 'true' : 'false';
                            if (typeof v === 'number') return String(v);
                            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
                            return `'${String(v).replace(/'/g, "''")}'`;
                        });
                        return `(${vals.join(', ')})`;
                    });

                    const updateCols = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
                    const onConflictClause = updateCols ? `ON CONFLICT ("id") DO UPDATE SET ${updateCols}` : `ON CONFLICT ("id") DO NOTHING`;

                    sqlContent += `INSERT INTO public."${tableId}" (${colsStr}) VALUES\n${valueTuples.join(',\n')}\n${onConflictClause};\n\n`;
                }
            }
        }

        sqlContent += `
COMMIT;
-- =========================================================================
-- Backup Complete Successfully!
-- =========================================================================
`;

        // إطلاق تحميل الملف بصيغة .sql
        const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Al-Noor Gas Stations_Backup_${new Date().toISOString().split('T')[0]}.sql`;
        link.click();
        URL.revokeObjectURL(url);

        onProgress?.('✅ تم تحميل سكريبت SQL بنجاح!');
        return { success: true };
    } catch (err: any) {
        console.error("SQL Export Error:", err);
        return { success: false, error: err.message };
    }
}

// =========================================================================
// 3️⃣ استعادة البيانات الذكية من ملف (يقبل Excel أو SQL تلقائياً)
// =========================================================================
export async function restoreUnifiedFile(
    file: File,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; totalRestored: number; error?: string }> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.sql')) {
        return await restoreFromSQL(file, onProgress);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return await restoreFromExcel(file, onProgress);
    } else {
        return { success: false, totalRestored: 0, error: "صيغة الملف غير مدعومة! يرجى اختيار ملف Excel (.xlsx) أو ملف SQL (.sql)" };
    }
}

// أ. استعادة من ملف SQL
export async function restoreFromSQL(
    file: File,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; totalRestored: number; error?: string }> {
    try {
        onProgress?.('⏳ جاري قراءة وتحليل ملف SQL...');
        const sqlText = await file.text();
        
        // استخراج جميع جمل INSERT
        const insertRegex = /INSERT\s+INTO\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:ON\s+CONFLICT|;)/gi;
        let match;
        const parsedTables: Record<string, any[]> = {};
        let grandTotal = 0;

        while ((match = insertRegex.exec(sqlText)) !== null) {
            const table = match[1].trim();
            const cols = match[2].split(',').map(c => c.trim().replace(/["`]/g, ''));
            const valuesBlock = match[3].trim();
            
            const tupleRegex = /\(([\s\S]*?)\)(?:,|$)/g;
            let tMatch;
            if (!parsedTables[table]) parsedTables[table] = [];

            while ((tMatch = tupleRegex.exec(valuesBlock)) !== null) {
                const rawRow = tMatch[1].trim();
                if (!rawRow) continue;

                // فك الحقول مع احترام الفواصل داخل النصوص
                const vals: string[] = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < rawRow.length; i++) {
                    const char = rawRow[i];
                    if (char === "'" && rawRow[i - 1] !== '\\') {
                        if (inQuotes && rawRow[i + 1] === "'") {
                            current += "'";
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        vals.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                vals.push(current.trim());

                if (vals.length === cols.length) {
                    const rowObj: any = {};
                    cols.forEach((col, idx) => {
                        let v = vals[idx];
                        if (v.endsWith('::jsonb')) v = v.substring(0, v.length - 7).trim();
                        if (v === 'NULL' || v === 'null') rowObj[col] = null;
                        else if (v === 'true') rowObj[col] = true;
                        else if (v === 'false') rowObj[col] = false;
                        else if (v.startsWith("'") && v.endsWith("'")) {
                            const rawStr = v.slice(1, -1);
                            try {
                                if (rawStr.startsWith('{') || rawStr.startsWith('[')) {
                                    rowObj[col] = JSON.parse(rawStr);
                                } else {
                                    rowObj[col] = rawStr;
                                }
                            } catch(e) {
                                rowObj[col] = rawStr;
                            }
                        } else if (!isNaN(Number(v))) {
                            rowObj[col] = Number(v);
                        } else {
                            rowObj[col] = v;
                        }
                    });
                    parsedTables[table].push(rowObj);
                    grandTotal++;
                }
            }
        }

        // استعادة الجداول بالترتيب الصحيح
        const sortedTables = RESTORE_DEPENDENCY_ORDER.filter(t => parsedTables[t]);
        Object.keys(parsedTables).forEach(t => {
            if (!sortedTables.includes(t)) sortedTables.push(t);
        });

        for (const table of sortedTables) {
            const rows = parsedTables[table];
            if (!rows || rows.length === 0) continue;

            onProgress?.(`⏳ جاري استعادة جدول ${table} (${rows.length} سجل)...`);
            
            // رفع على دفعات من 50 صف
            for (let i = 0; i < rows.length; i += 50) {
                const chunk = rows.slice(i, i + 50);
                const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
                if (error) {
                    console.warn(`Upsert warning for ${table}:`, error.message);
                }
            }
        }

        onProgress?.(`✅ تمت استعادة ${grandTotal} سجل بنجاح من ملف SQL!`);
        return { success: true, totalRestored: grandTotal };
    } catch (err: any) {
        console.error("SQL Restore Error:", err);
        return { success: false, totalRestored: 0, error: err.message };
    }
}

// ب. استعادة من ملف Excel
export async function restoreFromExcel(
    file: File,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; totalRestored: number; error?: string }> {
    try {
        onProgress?.('⏳ جاري قراءة ملف الإكسل...');
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        let grandTotal = 0;

        // مصفوفة لتخزين بيانات كل شيت
        const sheetsData: Record<string, any[]> = {};

        for (const sheetName of workbook.SheetNames) {
            // محاولة مطابقة اسم الشيت مع جدول الداتابيز
            let targetTable = '';
            
            // 1. مطابقة مباشرة
            const matchedMeta = SYSTEM_TABLES.find(t => 
                t.id.toLowerCase() === sheetName.toLowerCase() || 
                sheetName.includes(t.name) || 
                t.name.includes(sheetName)
            );
            if (matchedMeta) {
                targetTable = matchedMeta.id;
            } else {
                targetTable = sheetName.trim();
            }

            const ws = workbook.Sheets[sheetName];
            const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
            if (!rawRows || rawRows.length === 0) continue;

            // تحديد سطر العناوين (البحث عن سطر يحتوي على أسماء الحقول)
            let headerRowIndex = 0;
            for (let r = 0; r < Math.min(rawRows.length, 6); r++) {
                const row = rawRows[r];
                if (Array.isArray(row) && row.some(cell => {
                    const cStr = String(cell || '');
                    return cStr.includes('ID') || cStr.includes('رقم') || cStr.includes('تاريخ') || cStr.includes('name') || cStr.includes('المبلغ');
                })) {
                    headerRowIndex = r;
                    break;
                }
            }

            const headers = rawRows[headerRowIndex] || [];
            const dataRows = rawRows.slice(headerRowIndex + 1);

            // خريطة تحويل العناوين العربية إلى أسماء الحقول الأصلية
            const fieldMap: Record<number, string> = {};
            const meta = SYSTEM_TABLES.find(t => t.id === targetTable);

            headers.forEach((h: any, colIdx: number) => {
                const hStr = String(h || '').trim();
                if (!hStr) return;

                // 1. فحص إذا كان العنوان هو اسم الحقل الأصلي
                if (meta?.columns.includes(hStr)) {
                    fieldMap[colIdx] = hStr;
                    return;
                }

                // 2. فحص من خريطة العناوين
                if (meta?.labels) {
                    for (const [key, label] of Object.entries(meta.labels)) {
                        if (hStr === label || hStr.includes(label) || label.includes(hStr)) {
                            fieldMap[colIdx] = key;
                            return;
                        }
                    }
                }

                // 3. تخمين بناءً على الكلمات
                if (hStr.includes('ID') || hStr.includes('معرف')) fieldMap[colIdx] = 'id';
                else if (hStr.includes('تاريخ')) fieldMap[colIdx] = targetTable === 'expenses' ? 'exp_date' : 'date';
                else if (hStr.includes('مبلغ') || hStr.includes('إجمالي')) fieldMap[colIdx] = targetTable === 'invoices' ? 'total_amount' : 'amount';
            });

            const parsedRows: any[] = [];
            dataRows.forEach(row => {
                if (!Array.isArray(row) || row.every(c => c === null || c === '')) return;
                
                // تخطي سطر الإجماليات
                if (String(row[0] || '').includes('الإجمالي')) return;

                const rowObj: any = {};
                let hasValidData = false;

                Object.entries(fieldMap).forEach(([cIdxStr, fieldKey]) => {
                    const cIdx = Number(cIdxStr);
                    let val = row[cIdx];
                    if (val !== undefined && val !== null && val !== '') {
                        hasValidData = true;
                        // فحص إذا كان التاريخ سيريال إكسل
                        if (fieldKey.includes('date') && typeof val === 'number') {
                            val = new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().split('T')[0];
                        }
                        rowObj[fieldKey] = val;
                    }
                });

                if (hasValidData) {
                    parsedRows.push(rowObj);
                }
            });

            if (parsedRows.length > 0) {
                sheetsData[targetTable] = parsedRows;
            }
        }

        // تنفيذ الاستعادة بالترتيب
        const sortedTables = RESTORE_DEPENDENCY_ORDER.filter(t => sheetsData[t]);
        Object.keys(sheetsData).forEach(t => {
            if (!sortedTables.includes(t)) sortedTables.push(t);
        });

        for (const table of sortedTables) {
            const rows = sheetsData[table];
            if (!rows || rows.length === 0) continue;

            onProgress?.(`⏳ جاري استعادة جدول ${table} (${rows.length} سجل)...`);
            for (let i = 0; i < rows.length; i += 50) {
                const chunk = rows.slice(i, i + 50);
                const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
                if (error) {
                    console.warn(`Excel upsert warning for ${table}:`, error.message);
                } else {
                    grandTotal += chunk.length;
                }
            }
        }

        onProgress?.(`✅ تمت استعادة ${grandTotal} سجل بنجاح من ملف الإكسل!`);
        return { success: true, totalRestored: grandTotal };
    } catch (err: any) {
        console.error("Excel Restore Error:", err);
        return { success: false, totalRestored: 0, error: err.message };
    }
}

// =========================================================================
// 4️⃣ مسح القيود والعمليات وتصفير الحركات (مع الحفاظ على الأساسيات والشجرة)
// =========================================================================
export async function clearTransactionsOnly(
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        onProgress?.('🛡️ بدء عملية مسح القيود والعمليات وسجل الورديات والرحلات...');

        // 1. محاولة المسح الشامل الموثوق عبر Server Admin API (بصلاحيات Service Role لتجاوز قيود RLS والـ Foreign Keys)
        try {
            const apiRes = await fetch('/api/admin/clear-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_transactions' })
            });

            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.success) {
                    onProgress?.('✅ تم مسح جميع القيود وسجل الورديات وأوامر تشغيل الرحلات وتصفير الحركات بنجاح!');
                    return { success: true };
                }
            }
        } catch (apiErr) {
            console.warn('Admin API wipe error, falling back to direct client deletion:', apiErr);
        }

        // مسح الجداول التشغيلية بترتيب عكسي آمن كخيار احتياطي
        for (const table of CLEAR_TRANSACTIONS_ORDER) {
            onProgress?.(`🧹 جاري إفراغ جدول: ${table}...`);
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) {
                console.warn(`Warning deleting from ${table}:`, error.message);
            }
        }

        // تصفير الأرصدة المتراكمة مع الحفاظ على الكتالوج والشركاء
        onProgress?.('🔄 جاري تصفير أرصدة المخزون والخزانات...');
        
        // 1. تصفير أرصدة المستودعات والخزانات
        try {
            await supabase.from('warehouse_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        } catch(e){}

        // 2. تصفير الكميات في كتالوج الأصناف
        try {
            await supabase.from('inventory_items').update({ current_quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        } catch(e){}

        onProgress?.('✅ تم مسح جميع القيود والعمليات وتصفير الحركات بنجاح مع الاحتفاظ بكافة الأساسيات!');
        return { success: true };
    } catch (err: any) {
        console.error("Clear Transactions Error:", err);
        return { success: false, error: err.message };
    }
}

// =========================================================================
// 5️⃣ إعادة ضبط المصنع الشاملة للسيستم (Full System Factory Reset)
// =========================================================================
export async function fullFactoryReset(
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        onProgress?.('⚠️ بدء إعادة ضبط المصنع الشاملة للنظام...');

        // 1. محاولة المسح الشامل الموثوق عبر Server Admin API
        try {
            const apiRes = await fetch('/api/admin/clear-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'factory_reset' })
            });

            if (apiRes.ok) {
                const apiData = await apiRes.json();
                if (apiData.success) {
                    onProgress?.('✅ تمت إعادة ضبط المصنع بالكامل! النظام الآن مهيأ كبداية جديدة نظيفة.');
                    return { success: true };
                }
            }
        } catch (apiErr) {
            console.warn('Admin API factory reset error, falling back to direct client deletion:', apiErr);
        }

        // 1. أولاً: مسح كافة العمليات والحركات
        await clearTransactionsOnly(onProgress);

        // 2. ثانياً: مسح الجداول التشغيلية والتكميلية
        const extraTables = [
            'warehouse_inventory',
            'vehicle_inventory',
            'notifications',
            'user_requests',
            'user_tasks',
            'payroll_slips',
            'fleet_vehicles',
            'partners',
            'inventory_items'
        ];

        for (const table of extraTables) {
            onProgress?.(`🧹 تهيئة جدول: ${table}...`);
            try {
                await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            } catch (e) {
                console.warn(`Error wiping extra table ${table}:`, e);
            }
        }

        // مسح المستودعات باستثناء المستودع الرئيسي الافتراضي
        try {
            await supabase.from('warehouses').delete().neq('id', '11111111-1111-1111-1111-111111111111');
        } catch(e){}

        onProgress?.('✅ تمت إعادة ضبط المصنع بالكامل! النظام الآن مهيأ كبداية جديدة نظيفة.');
        return { success: true };
    } catch (err: any) {
        console.error("Factory Reset Error:", err);
        return { success: false, error: err.message };
    }
}
