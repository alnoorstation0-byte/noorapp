export const menuGroups = [
    { 
        group: "الرئيسية والملخصات", 
        items: [
            { id: 'dashboard', title: 'لوحة القيادة والتحكم', icon: '⚡', path: '/Dashboard' },
            { id: 'global_summary', title: 'الملخص العام', icon: '📊', path: '/GlobalSummary' },
            { id: 'kpis', title: 'مؤشرات الأداء التشغيلي', icon: '🎯', path: '/kpis' },
            { id: 'profit_dashboard', title: 'أرباح ومؤشرات المحطة', icon: '📈', path: '/profit-dashboard' }
        ] 
    },
    { 
        group: "التشغيل والمبيعات", 
        items: [
            { id: 'pos', title: 'شاشة الكاشير (POS)', icon: '⛽', path: '/pos' },
            { id: 'pos_dashboard', title: 'أرباح منافذ البيع', icon: '💹', path: '/pos/dashboard' },
            { id: 'pos_settlements', title: 'تسوية الورديات والعدادات', icon: '🏪', path: '/pos-settlements' },
            { id: 'invoices', title: 'الفواتير والمبيعات', icon: '🧾', path: '/invoices' },
            { id: 'sales_analysis', title: 'تحليل المبيعات', icon: '📊', path: '/sales-analysis' }
        ] 
    },
    { 
        group: "المستودع وخزانات الوقود", 
        items: [
            { id: 'inventory', title: 'الأصناف وخزانات الوقود', icon: '🛢️', path: '/inventory' },
            { id: 'item_card', title: 'بطاقة الصنف والحركة', icon: '🏷️', path: '/item-card' },
            { id: 'reorder_alerts', title: 'تنبيهات حدود الطلب والنواقص', icon: '⚠️', path: '/reorder-alerts' },
            { id: 'inventory_valuation', title: 'تقييم المخزون', icon: '💰', path: '/inventory-valuation' },
            { id: 'purchase_orders', title: 'أوامر الشراء والتوريد', icon: '🛒', path: '/purchase_orders' },
            { id: 'warehouses', title: 'المستودعات والخزانات', icon: '🏢', path: '/inventory/warehouses' },
            { id: 'inventory_transactions', title: 'حركات المخزون والتوريد', icon: '🔄', path: '/inventory/transactions' }
        ] 
    },
    { 
        group: "الحسابات والمالية", 
        items: [
            { id: 'receipts', title: 'سندات القبض', icon: '📥', path: '/ReceiptVouchers' }, 
            { id: 'payments', title: 'سندات الصرف', icon: '📤', path: '/PaymentVouchers' }, 
            { id: 'expenses', title: 'المصروفات التشغيلية', icon: '💸', path: '/expenses' }, 
            { id: 'journal', title: 'دفتر اليومية العامة', icon: '📓', path: '/journal' }, 
            { id: 'manual_journals', title: 'القيود اليدوية', icon: '📝', path: '/ManualJournals' },
            { id: 'accounts', title: 'شجرة الحسابات', icon: '🌳', path: '/accounts' },
            { id: 'ledger', title: 'دفتر الأستاذ العام', icon: '📒', path: '/ledger' }, 
            { id: 'trialbalance', title: 'ميزان المراجعة', icon: '⚖️', path: '/trialbalance' },
            { id: 'financial_center', title: 'المركز المالي', icon: '🏛️', path: '/financial-center' },
            { id: 'financial_statements', title: 'القوائم المالية', icon: '📑', path: '/financial-statements' },
            { id: 'financialplan', title: 'الموازنة والخطة المالية', icon: '📅', path: '/financialplan' },
            { id: 'cashflows', title: 'التدفقات النقدية', icon: '🌊', path: '/cashflows' },
            { id: 'vat_return', title: 'الإقرار الضريبي (15%)', icon: '📋', path: '/vat-return' }
        ] 
    },
    { 
        group: "العملاء والشركاء", 
        items: [
            { id: 'partners', title: 'دليل العملاء والشركاء', icon: '👥', path: '/partners' },
            { id: 'partner_balances', title: 'أرصدة العملاء والشركاء', icon: '⚖️', path: '/PartnerBalances' },
            { id: 'statement', title: 'كشف حساب تفصيلي', icon: '📜', path: '/statement' },
            { id: 'ar_aging', title: 'أعمار الديون والتحصيل', icon: '⏳', path: '/ar-aging' }
        ] 
    },
    { 
        group: "النظام والتقارير", 
        items: [
            { id: 'reports', title: 'التقارير الشاملة', icon: '📊', path: '/reports' }, 
            { id: 'audit', title: 'المراجعة وسجل العمليات', icon: '🔍', path: '/audit' },
            { id: 'payroll', title: 'مسيرات الرواتب والأجور', icon: '💵', path: '/payroll' },
            { id: 'settings', title: 'إعدادات النظام والنسخ', icon: '⚙️', path: '/settings' },
            { id: 'permissions', title: 'مصفوفة الصلاحيات والرتب', icon: '🛡️', path: '/settings/permissions' },
            { id: 'notifications', title: 'مركز التنبيهات', icon: '🔔', path: '/notifications' },
            { id: 'profile', title: 'الملف الشخصي', icon: '👤', path: '/profile' }
        ] 
    }
];