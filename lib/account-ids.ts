/**
 * 🔑 الملف المرجعي الموحد لمعرّفات الحسابات
 * =============================================
 * هذا هو المصدر الوحيد للحقيقة (Single Source of Truth) لكل IDs الحسابات.
 * بدلاً من تكرار UUIDs في كل ملف، نستوردها من هنا.
 *
 * ⚠️  إذا تغيّر السيرفر أو أُعيد تهيئة قاعدة البيانات، عدّل هنا فقط.
 * آخر تحديث: 2026-09-11 — مبني على الإدخال المعتمد من جدول accounts
 */

export const ACC = {

  // ── الأصول الثابتة (11) ─────────────────────────────
  FIXED_ASSETS:              'fdae15bc-6b09-4d0f-81c9-f21f79bb89d8', // 11
  MACHINERY_EQUIPMENT:       '53965792-c956-4f08-b95b-65d587bb6921', // 111
  VEHICLES:                  '863efbe7-4873-467f-b510-90895c89b440', // 112
  OFFICE_FURNITURE:          'db938fd1-0c31-4df0-9aae-ff9361c7f425', // 113
  ACCUMULATED_DEPRECIATION:  'ab7f58e1-2ee1-4690-9ee7-d6d65bab0d45', // 114

  // ── الأصول المتداولة (12) ───────────────────────────
  CURRENT_ASSETS:            'e8a1334a-673c-4cec-9966-353462d598de', // 12
  CASH_BOX:                  '21b8a1db-bc9f-4cf8-b741-1efeded0963c', // 122 الخزينة الرئيسية
  CUSTOMERS_AR:              '4f828d0d-a1f4-4762-83e3-c17dafae802d', // 123 العملاء
  GUARANTEES_HELD:           '8bf39cb1-4028-4c9e-817d-27c239873030', // 124 تأمينات محتجزة لدى الغير
  EMPLOYEE_CUSTODY:          'f9c7ba68-6998-48e6-99b3-3a4526d820a1', // 125 عهدة موظفين/مناديب
  INVENTORY:                 'c5efa035-c8d5-4d13-bf33-7c7cd854f393', // 126 مخزون البضائع
  SITE_LABOR_ADVANCES:       'bcf3c593-4058-400e-8ee9-f38255d405b9', // 127 سلف عمالة الموقع
  EMPLOYEE_ADVANCES:         '31c9923a-3629-4f3f-b661-b86df51c8e09', // 128 سلف موظفين الشركة
  BANKS:                     'da7ee249-ee43-47da-9e8c-3d623c3f1b50', // 129 البنوك
  INVENTORY_CUSTODY:         'd133777e-c5f6-42be-b333-ccce6496b97f', // 130 عهدة مخزون

  // ── فروع البنوك ─────────────────────────────────────
  BANK_ALRAJHI:              '23623b40-72f8-460b-92f6-984457003a34', // 1291 بنك الراجحي
  BANK_RIYADH:               '1677efed-498a-4971-b026-af4527d383e3', // 1292 حساب الرياض

  // ── الالتزامات المتداولة (21) ─────────────────────
  CURRENT_LIABILITIES:       'a4f67e95-74f8-4e63-be40-2f798c1abb5f', // 21
  SUPPLIERS_AP:              '2ca6f54c-5f37-49a0-8c41-e37f94b09752', // 211 الموردون
  SUBCONTRACTOR_OBLIGATIONS: '27f37adf-c0ec-4b40-80d0-2b36b853fd4b', // 212 التزام مقاولي الباطن
  SUBCONTRACTOR_RETENTIONS:  'ccf295e3-4225-4f2e-85fc-7f61cf6e9ec9', // 213 تأمينات محتجزة لمقاولي الباطن
  CUSTOMER_ADVANCES:         'bec2a969-6b4b-4a2b-9d4c-31023a836950', // 214 دفعات مقدمة من العملاء
  VAT_PAYABLE:               '990c949c-5f32-40d7-8d36-5fe45a6c892c', // 215 ضريبة القيمة المضافة
  ACCRUED_SALARIES:          '39f878cd-dc58-4a2a-a199-50f6fca983d4', // 216 رواتب وأجور مستحقة
  CLIENT_MATERIALS_HELD:     '85e61a6a-8c85-4219-a733-3b2180dfe043', // 217 مخزون خامات العميل
  DEFERRED_RENT:             '5b5af031-b93c-4f63-b964-9d7b2366739a', // 218 إيجارات آجلة
  PENDING_INVOICES:          'c4b01e7f-b892-4517-bdc9-7cc97d8112f6', // 219 فواتير قيد الاستلام

  // ── حقوق الملكية (3) ──────────────────────────────
  EQUITY:                    '9f4e8d10-81e2-48f3-baf6-37eb8bcd43ed', // 3
  CAPITAL:                   'd185870e-08ce-4eae-ba9c-75b39371fae3', // 31 رأس المال
  PARTNERS_CURRENT:          '5f0dd2c0-6bbc-4557-95b1-b5eb3ae6710a', // 32 جاري الشركاء
  RETAINED_EARNINGS:         '7dd590b4-b959-4b16-8874-d7c155e1c940', // 33 الأرباح المرحلة
  CURRENT_YEAR_PNL:          'ae792a70-705d-4079-a722-b679461bff4a', // 34 أرباح وخسائر العام الحالي

  // ── الإيرادات (4) ─────────────────────────────────
  REVENUE:                   'f5ae030f-4368-4266-8bdb-a1ac1242ca31', // 4 الإيرادات
  SALES_REVENUE:             '6667f91a-9478-49ab-9721-521ee09381fa', // 41 إيرادات المبيعات
  ENGINEERING_SERVICES:      'ce125f8c-5d3b-4cd7-83a9-5d4435e74a51', // 42 إيرادات خدمات هندسية
  SCRAP_SALES:               '661e312e-c969-4826-a0d1-c876686f008d', // 43 إيرادات بيع مخلفات
  OTHER_REVENUE:             '302d8053-a970-4852-8ecb-62fed57dff29', // 44 إيرادات أخرى
  HOUSING_RECOVERY:          'dd728251-aec7-4d2f-939a-4985d93f2966', // 45 استرداد مصاريف السكن
  LABOR_PENALTIES_REVENUE:   '25998af5-dca4-4512-8f1a-3d0f9c6b8e98', // 46 إيراد جزاءات عمالة
  ACCRUED_REVENUE:           '064296d3-3883-43ce-b023-487e0ab5443c', // 47 خصوم مكتسبة
  SUBCONTRACTOR_REVENUE:     'd2681b91-5170-4fa5-a09c-013aca6aa596', // 48 إيراد خدمات مقاولي الباطن

  // ── التكاليف المباشرة (51) ──────────────────────────
  DIRECT_COSTS:              'e7d03c8e-de92-4350-a2f0-abf7a48636b6', // 51 (أب)
  COGS:                      'e03c1430-0275-424f-8a93-eae8bc8990bf', // 511 تكلفة المبيعات
  SITE_LABOR_WAGES:          '70d181ba-6385-4c1e-b0fc-d5b1f800dd2c', // 512 أجور ومرتبات عمالة الموقع
  SUBCONTRACTOR_COSTS:       'da2d6fcd-ef45-41f4-a8d1-a498b6954002', // 513 تكاليف مقاولين باطن
  EQUIPMENT_RENT_FUEL:       '4b104331-8abf-4960-9ab6-fcfcf63962cc', // 514 إيجار معدات ووقود
  PERMITS_FEES:              'c4a4b242-4536-4f56-8723-6c157c61126b', // 515 تصاريح ورسوم حكومية
  LABOR_FOOD:                'ec0fc82a-844e-4cd4-91f8-23d14b0aa587', // 516 إعاشة وطعام عمالة
  TRANSPORT:                 '24db3969-e42e-488d-ac9e-468a6eba3ef5', // 517 انتقالات ومشالات
  SMALL_TOOLS:               '7fd49d77-c4a0-49a0-8cf6-ca39f62330fe', // 518 أدوات ومهمات صغيرة
  HOUSING_INTERNET:          'a02ac1f1-27ba-4236-8a8c-ebe71102fa96', // 519 تكاليف السكن والإنترنت
  MAINTENANCE:               'd363da67-4228-4758-9ed7-1821d62585ac', // 520 مصروفات صيانة

  // ── مصروفات إدارية (52) ─────────────────────────────
  ADMIN_EXPENSES:            '63c21092-0397-41c1-bec6-6fbc34283807', // 52 (أب)
  ADMIN_SALARIES:            '27b19f80-f5d7-4877-bfca-361488afd89d', // 521 رواتب الإدارة العامة
  OFFICE_RENT:               '36eb47a6-5a1f-4e88-99ea-27dede3244e8', // 522 إيجار مقر الشركة
  BANK_FEES:                 '69c8f7b8-aa6d-40ea-b870-5cadb0afa35d', // 523 مصاريف بنكية وعمولات
  UTILITIES_ADMIN:           'd7ec0140-da41-47c3-aa50-8a8af51e3ffc', // 524 كهرباء ومياه وإنترنت
  HOSPITALITY:               '65870723-cab0-4ba6-a9c8-f7d935f6ba87', // 525 ضيافة وبوفيه وقرطاسية
  MARKETING:                 '4b1d7369-accb-4e22-b796-929dfb8b3b23', // 526 مصاريف تسويق
  ROUNDING_DIFF:             'd5e827b1-4f1a-4c2f-8a03-8d6e7f123456', // 527 تسويات وفروق هللات
  WASTE_LOSS:                'a5280000-0000-4000-a000-000000000528', // 528 خسائر توالف وهدر مخزني

} as const;

// ─── اختصارات للاستخدام السريع ───────────────────────────────────────────────

/** حسابات المبيعات */
export const SALES_ACCOUNTS = {
  AR:            ACC.CUSTOMERS_AR,       // 123
  REVENUE:       ACC.SALES_REVENUE,      // 41
  VAT:           ACC.VAT_PAYABLE,        // 215
  COGS:          ACC.COGS,              // 511
  INVENTORY:     ACC.INVENTORY,          // 126
  INV_CUSTODY:   ACC.INVENTORY_CUSTODY,  // 130
};

/** حسابات الرواتب */
export const PAYROLL_ACCOUNTS = {
  SITE_WAGES_EXP:   ACC.SITE_LABOR_WAGES,   // 512 مدين
  ADMIN_SALARY_EXP: ACC.ADMIN_SALARIES,     // 521 مدين
  SITE_ADVANCES:    ACC.SITE_LABOR_ADVANCES, // 127 دائن
  EMP_ADVANCES:     ACC.EMPLOYEE_ADVANCES,   // 128 دائن
  ACCRUED:          ACC.ACCRUED_SALARIES,    // 216 دائن
};

/** حسابات النقدية والبنوك */
export const CASH_ACCOUNTS = {
  CASH_BOX:  ACC.CASH_BOX,     // 122
  BANKS:     ACC.BANKS,        // 129
  ALRAJHI:   ACC.BANK_ALRAJHI, // 1291
  RIYADH:    ACC.BANK_RIYADH,  // 1292
};

