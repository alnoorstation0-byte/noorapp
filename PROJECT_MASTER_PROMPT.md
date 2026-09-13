# 🌊 المرجع الشامل والبرومبت الماستر لنظام شركة مياه الغيم المحدودة
### Master Technical Blueprint & System Prompt — Elghayam Water ERP

> **دليل الاستناد المرجعي الشامل:** هذا المستند يمثل المرجع البرمجي، المحاسبي، والتشغيلي الموحد لكافة صفحات النظام، الدوال البرمجية (Functions/RPCs)، قواعد البيانات (Database Schema)، التريجرز (Triggers)، والمعادلات الحسابية، بحيث يمكن استخدامه كـ **System Prompt** كامل لتوجيه أي مطور أو نموذج ذكاء اصطناعي، أو كمرجع إداري وهندسي للمشروع.

---

## 📑 فهرس المحتويات
1. [بطاقة تعريف النظام والتقنيات (System Architecture)](#1-بطاقة-تعريف-النظام-والتقنيات)
2. [هوية التصميم: ميثاق أكوا جلاسمورفيزم (Aqua Glassmorphism Guidelines)](#2-هوية-التصميم-ميثاق-أكوا-جلاسمورفيزم)
3. [دليل الصفحات والمسارات الشامل (Full App Routes & Pages)](#3-دليل-الصفحات-والمسارات-الشامل)
4. [هيكل قاعدة البيانات والجداول (Database Schema)](#4-هيكل-قاعدة-البيانات-والجداول)
5. [شجرة الحسابات والثوابت المالية الموحدة (Chart of Accounts & Constants)](#5-شجرة-الحسابات-والثوابت-المالية-الموحدة)
6. [دوال قاعدة البيانات والتريجرز (Database RPCs & Triggers)](#6-دوال-قاعدة-البيانات-والتريجرز)
7. [المعادلات الحسابية والرياضية في النظام (System Formulas & Logic)](#7-المعادلات-الحسابية-والرياضية-في-النظام)
8. [الدورات المستندية والسيناريوهات التشغيلية (End-to-End Scenarios)](#8-الدورات-المستندية-والسيناريوهات-التشغيلية)
9. [محرك المزامنة اللحظية والشبكة (Realtime Sync & Audio/Haptic POS Engine)](#9-محرك-المزامنة-اللحظية-والشبكة)

---

## 1. بطاقة تعريف النظام والتقنيات

- **طبيعة النشاط:** نظام إدارة وتوزيع متكامل لشركة إنتاج وتوزيع مياه ومواد غذائية (Food & Beverage / Water Bottling & Distribution).
- **إطار العمل الأساسي:** `Next.js 16 (App Router)` مع `React 19` و `TypeScript`.
- **محرك البيانات والباك اند:** `Supabase (PostgreSQL)` متضمناً `Row Level Security (RLS)`، `Edge RPC Functions`، و `Postgres Triggers`.
- **إدارة الحالة ومزامنة البيانات:** `@tanstack/react-query` مع طبقة بث لحظي مخصصة عبر `Supabase Realtime WebSockets`.
- **المكتبات المساعدة:** `Web Audio API` (نغمات نقاط البيع والماسح الباركود)، `Web Vibration API` (الاهتزاز اللمسي)، ماسح كاميرا احترافي بالليزر البصري عبر HTML5 Video.

---

## 2. هوية التصميم: ميثاق أكوا جلاسمورفيزم (Aqua Glassmorphism Guidelines)

النظام مبني وفق معايير صارمة لتجربة المستخدم (UI/UX):
1. **لوحة الألوان المعتمدة:**
   - **اللون الأساسي (Primary):** `#1C73AB` (الأزرق المؤسسي المائي).
   - **اللون التفاعلي (Accent Gradient):** `#2891C8` إلى `#7FD4E3` (تدرج السيان المضيء والأكوا).
   - **خلفية الصفحات (Background):** `#F4F1EE` (أوف وايت ناعم ومريح للعين — يُمنع استخدام الأبيض الصريح `#ffffff` كخلفية للصفحة).
   - **ألوان الحالات المالية (Status):**
     - أخضر نيون / اعتماد: `#16a34a` (Success)
     - أحمر / مدين / تحذير: `#ef4444` (Danger)
     - برتقالي / معلق / عهدة: `#f59e0b` (Pending/Warning)
2. **خصائص الزجاج (The Glassmorphism Identity):**
   - الحاويات والبطاقات: `background: rgba(255, 255, 255, 0.6)` إلى `rgba(255, 255, 255, 0.85)`.
   - الفلتر الخلفي: `backdrop-filter: blur(40px) saturate(200%)`.
   - الحدود الزجاجية: `border: 1px solid rgba(255, 255, 255, 0.4)` إلى `rgba(28, 115, 171, 0.2)`.
3. **الانحناءات والحركة (Micro-Interactions):**
   - حواف ناعمة دائرية: `border-radius: 20px` للبطاقات، و `border-radius: 0 0 20px 20px` للهيدر الرئيسي.
   - تفاعل التحليق: العناصر القابلة للنقر ترتفع للأعلى `transform: translateY(-5px)` مع زيادة توهج الظل.
4. **التوافق التام مع الجوال:**
   - الجداول تدعم التمرير الأفقي `overflow-x: auto`.
   - الأزرار بارتفاع لمسي لا يقل عن `44px`.
   - النوافذ المنبثقة (Modals) تشغل `95vw` على شاشات الهواتف (`<= 768px`).

---

## 3. دليل الصفحات والمسارات الشامل

| المسار (Route) | المسمى بالعربية | الوصف البرمجي والتشغيلي | المكونات الرئيسية المرتبطة |
| :--- | :--- | :--- | :--- |
| `/Dashboard` | لوحة القيادة التنفيذية | عرض المؤشرات العامة، حركة المبيعات اليومية، والرسوم البيانية السريعة. | `DashboardOverview`, `MasterPage` |
| `/GlobalSummary` | الملخص العام | تجميع مالي ومخزني عام لأصول والتزامات ومخزون المؤسسة. | `GlobalSummaryCards` |
| `/pos` | كاشير نقاط البيع (POS) | بيع مباشر وسريع، فواتير نقدية وشبكة وآجل، قراءة باركود بالكاميرا والصوت، فحص حالة الوردية. | `pos_logic.ts`, `ShiftCloseModal`, `BarcodeScannerWidget` |
| `/pos/dashboard` | أرباح منافذ البيع | تقارير أداء منافذ البيع، نسب الربحية لكل نقطة بيع، وسجل مبيعات الكاشير. | `pos_dashboard_logic` |
| `/pos-settlements` | تسوية عهد منافذ البيع | إغلاق الورديات، مقارنة النقدية الفعلية بالمتوقعة، ورصد العجز والزيادة. | `pos_settlements_logic.ts` |
| `/fleet_operations` | رحلات أسطول التشغيل | إدارة حركة سيارات التوزيع، تحميل البضاعة، جرد العائد، التوالف، ومصاريف الوقود. | `fleet_logic.ts`, `TripDetailsModal` |
| `/service-operations` | إيرادات الخدمات والتشغيل | توثيق الأعمال الإدارية، خدمات التوصيل والتشغيل للغير، احتساب عمولات الموظفين وصافي الأرباح. | `service_operations_logic.ts`, `ServiceOperationModal`, `ServiceOperationPrintModal` |
| `/invoices` | الفواتير والمبيعات | فواتير المبيعات B2B والآجلة، احتساب ضريبة القيمة المضافة 15%، الخصومات، والربط بالعملاء. | `invoices_logic.ts`, `InvoiceFormModal`, `InvoicePrintModal` |
| `/inventory` | دليل الأصناف والمخزون | تسجيل المنتجات، كرتونة المياه، القوارير المرتجعة، الأسعار الافتراضية، وحدود إعادة الطلب. | `InventoryItemModal`, `BarcodeCameraButton` |
| `/inventory/warehouses` | المستودعات ومستودعات السيارات | إدارة الفروع، المستودعات الثابتة، وسيارات التوزيع كمستودعات متحركة مربوطة بخزينة. | `warehouses_logic.ts` |
| `/inventory/transactions` | حركات المخزون | سندات الإدخال، الإخراج، التحويل بين المستودعات، الهدر والتوالف، واسترجاع الفوارغ. | `InventoryActionModal`, `transactions_logic` |
| `/inventory-valuation` | تقييم المخزون | تقييم البضاعة بسعر التكلفة والمتوسط المرجح ومطابقتها مع شجرة الحسابات العامة. | `valuation_logic.ts` |
| `/item-card` | كرت الصنف التفصيلي | حركة صنف محدد عبر الزمن (وارد، منصرف، رصيد متبقي) مع باركود فوري. | `item_card_page` |
| `/dead-stock` | الركود والمخزون الراكد | تحليل الأصناف البطيئة وغير المتحركة لتفادي الخسائر. | `dead_stock_logic` |
| `/reorder-alerts` | تنبيهات نواقص المخزون | إشعارات الأصناف التي وصلت إلى حد إعادة الطلب الأدنى. | `reorder_alerts_page` |
| `/purchase_orders` | أوامر الشراء | إدارة فواتير الشراء من الموردين، وإدخال كميات المياه والخامات للمستودع. | `purchase_orders_logic.ts` |
| `/ReceiptVouchers` | سندات القبض | تحصيل الأموال من العملاء والمناديب، ترحيلها للخزينة/البنك وتخفيض مديونية العميل. | `ReceiptVouchers_logic.ts`, `ReceiptVoucherModal` |
| `/PaymentVouchers` | سندات الصرف | صرف الأموال للموردين، سداد المصروفات، وتخفيض أرصدة الخزينة والبنوك. | `payment_vouchers_logic.ts`, `PaymentVoucherModal` |
| `/expenses` | المصروفات الإدارية والتشغيلية | فواتير المصاريف (محروقات، إعاشة، إيجارات، صيانة، رسوم حكومية) وربطها بالورديات. | `expenses_logic.ts`, `ExpenseFormModal` |
| `/journal` | دفتر اليومية العامة | عرض القيود المحاسبية الآلية المجمعة (المركبة والبسيطة) والتحقق من توازن الأطراف. | `journal_logic.ts`, `journal_headers`, `journal_lines` |
| `/ManualJournals` | القيود اليدوية والتسويات | إنشاء قيود محاسبية يدوية وتعديل الحسابات مع إمكانية الترحيل وفك الترحيل. | `manual_journals_logic.ts` |
| `/accounts` | شجرة الحسابات (دليل الحسابات) | استعراض الحسابات الشجرية (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات). | `accounts_logic.ts` |
| `/ledger` | دفتر الأستاذ العام | حركة كل حساب مالي مستقل مع الرصيد الافتتاحي والحركات والرصيد الختامي. | `ledger_logic.ts` |
| `/trialbalance` | ميزان المراجعة | التحقق الشامل من تساوي إجمالي الأرصدة المدينة والدائنة لكافة الحسابات. | `trialbalance_logic.ts` |
| `/financial-center` | المركز المالي (الميزانية العمومية) | ملخص الأصول المتداولة والثابتة مقابل الالتزامات وحقوق الملكية في لحظة زمنية. | `financial_center_logic.ts` |
| `/financial-statements` | القوائم المالية | قائمة الدخل (الأرباح والخسائر) وحساب صافي الربح التشغيلي والتراكمي. | `financial_statements_logic.ts` |
| `/cashflows` | قائمة التدفقات النقدية | متابعة السيولة الداخلة والخارجة من الأنشطة التشغيلية والتمويلية. | `cashflows_logic.ts` |
| `/partners` | دليل العملاء والمناديب والموردين | قاعدة بيانات الشركاء، أرقام الهواتف، السجل التجاري، والحد الائتماني وعهد القوارير. | `partners_logic.ts` |
| `/PartnerBalances` | أرصدة العملاء والشركاء | ملخص سريع لمديونيات العملاء ومستحقات الموردين مع البحث المتقدم. | `partner_balances_logic.ts` |
| `/delegate-debts` | ذمم وعُهد المناديب | مراقبة مديونيات مناديب التوزيع والعهد النقدية والبضاعة المسلمة لهم. | `delegate_debts_logic.ts` |
| `/delegate-settlements` | تسويات عُهد المناديب | تسوية مبيعات ومصروفات المندوب بعد انتهاء خط السير وإصدار إخلاء الطرف. | `delegate_settlements_logic.ts` |
| `/statement` | كشف الحساب الموحد | كشف حساب تفصيلي لأي شريك (عميل/مورد/مندوب/موظف) مستخرج من دفتر الأستاذ. | `statement_logic.ts`, `partner_statement_ledger` |
| `/payroll` | مسيرات الرواتب | كشوف رواتب الموظفين والعمال، السلف، الجزاءات، وصافي الراتب المستحق. | `payroll_logic.ts` |
| `/vat-return` | الإقرار الضريبي | ملخص المبيعات الخاضعة للضريبة والمشتريات والضريبة المستحقة للهيئة (15%). | `vat_return_logic.ts` |
| `/trip-profitability` | أرباح الرحلات المنفصلة | تحليل ربحية كل سيارة/رحلة توزيع على حدة (مبيعاتها - تكلفتها - مصاريفها). | `trip_profitability_logic.ts` |
| `/vehicle-expenses` | مصاريف المركبات | تتبع مصاريف الصيانة والزيوت والإطارات لكل شاحنة في الأسطول. | `vehicle_expenses_logic.ts` |
| `/sales-analysis` | تحليل المبيعات | تقارير أداء الأصناف الأكثر مبيعاً، المقارنات الشهرية، وسلوك العملاء. | `sales_analysis_logic.ts` |
| `/reports` | التقارير الشاملة | مركز التقارير الموحد لتوليد وتصدير ملفات PDF و Excel لكافة الموديولات. | `reports_logic.ts` |
| `/audit` | سجل المراجعة والرقابة | تتبع كافة العمليات الحساسة (إنشاء، تعديل، حذف) وهوية المستخدم المنفذ وتاريخها. | `audit_logic.ts` |
| `/team` & `/settings` | المستخدمين والصلاحيات | إدارة الموظفين، الأدوار (Admin, Manager, Staff, Cashier)، وصلاحيات الشاشات. | `team_logic.ts`, `usePermissions.ts` |

---

## 4. هيكل قاعدة البيانات والجداول

قاعدة البيانات مبنية في **Supabase PostgreSQL** وتعتمد على المفاتيح الأجنبية الصارمة:

```sql
-- 1. دليل الحسابات الموحد
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  account_type character varying NOT NULL, -- أصول، خصوم، حقوق ملكية، إيرادات، مصروفات
  parent_id uuid REFERENCES public.accounts(id),
  is_transactional boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. الشركاء (عملاء، موردين، موظفين، مناديب)
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  partner_type character varying NOT NULL, -- عميل، مورد، موظف، مندوب
  identity_number character varying,
  phone character varying,
  address text,
  vat_number character varying,
  job_role character varying,
  account_id uuid REFERENCES public.accounts(id),
  is_active boolean DEFAULT true,
  credit_limit numeric DEFAULT 0,
  credit_days integer DEFAULT 0,
  bottle_custody numeric DEFAULT 0, -- رصيد قوارير المياه المحتجزة كعهدة
  location_lat numeric,
  location_lng numeric,
  route_name text,
  created_at timestamptz DEFAULT now()
);

-- 3. المستودعات وفروع التوزيع
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  type character varying DEFAULT 'main' CHECK (type IN ('main', 'sub', 'vehicle', 'pos')),
  is_active boolean DEFAULT true,
  delegate_id uuid REFERENCES public.partners(id),
  location text,
  phone text,
  vehicle_id uuid,
  cash_account_id uuid REFERENCES public.accounts(id),
  created_at timestamptz DEFAULT now()
);

-- 4. الأصناف والمنتجات
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code character varying,
  name character varying NOT NULL,
  unit character varying NOT NULL DEFAULT 'حبة',
  current_quantity numeric DEFAULT 0,
  reorder_level numeric DEFAULT 5,
  default_price numeric DEFAULT 0,
  suggested_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  barcode character varying,
  is_active boolean DEFAULT true,
  item_type text DEFAULT 'water_product',
  is_returnable_bottle boolean DEFAULT false, -- قارورة مرتجعة
  tax_rate numeric DEFAULT 15,
  created_at timestamptz DEFAULT now()
);

-- 5. مخزون المستودعات التفصيلي
CREATE TABLE public.warehouse_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id),
  quantity numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 6. حركات المخزون العامة
CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number character varying NOT NULL UNIQUE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  type character varying NOT NULL CHECK (type IN ('in', 'out', 'transfer_out', 'transfer_in', 'sales_deduction', 'waste', 'empty_return')),
  quantity numeric NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  destination_warehouse_id uuid REFERENCES public.warehouses(id),
  partner_id uuid REFERENCES public.partners(id),
  delegate_id uuid REFERENCES public.partners(id),
  shift_id uuid,
  fleet_operation_id uuid,
  invoice_id uuid,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT (quantity * unit_price),
  notes text,
  status character varying DEFAULT 'pending',
  journal_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 7. ورديات نقاط البيع (POS Shifts)
CREATE TABLE public.pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  delegate_id uuid REFERENCES public.partners(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  starting_cash numeric NOT NULL DEFAULT 0,
  expected_cash numeric DEFAULT 0,
  actual_cash numeric DEFAULT 0,
  total_sales numeric DEFAULT 0,
  total_cash_sales numeric DEFAULT 0,
  total_card_sales numeric DEFAULT 0,
  total_credit_sales numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  shortage_overage numeric DEFAULT 0,
  starting_bottles numeric DEFAULT 0,
  bottles_sold numeric DEFAULT 0,
  bottles_returned numeric DEFAULT 0,
  actual_bottles numeric DEFAULT 0,
  bottles_shortage numeric DEFAULT 0,
  status character varying NOT NULL DEFAULT 'open',
  closing_notes text,
  created_at timestamptz DEFAULT now()
);

-- 8. فواتير المبيعات ونقاط البيع
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number character varying NOT NULL UNIQUE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  partner_id uuid REFERENCES public.partners(id),
  client_name character varying,
  description text,
  materials_discount numeric DEFAULT 0,
  taxable_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  payment_method character varying DEFAULT 'آجل',
  payment_status text DEFAULT 'unpaid',
  status character varying DEFAULT 'معلق',
  shift_id uuid REFERENCES public.pos_shifts(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  delegate_id uuid REFERENCES public.partners(id),
  fleet_operation_id uuid,
  debit_account_id uuid REFERENCES public.accounts(id),
  credit_account_id uuid REFERENCES public.accounts(id),
  lines_data jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 9. القيود المحاسبية العامة (دفتر اليومية الموحد)
CREATE TABLE public.journal_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  description character varying NOT NULL,
  status character varying DEFAULT 'draft',
  reference_id uuid,
  v_type text, -- invoice, receipt, payment, expense, service_revenue, shift_settlement
  fleet_operation_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  header_id uuid NOT NULL REFERENCES public.journal_headers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  partner_id uuid REFERENCES public.partners(id),
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  notes text,
  delegate_id uuid REFERENCES public.partners(id),
  created_at timestamptz DEFAULT now()
);

-- 10. العمليات وإيرادات الخدمات والتشغيل للغير (الموديول الجديد المستقل)
CREATE TABLE public.service_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_date date NOT NULL DEFAULT CURRENT_DATE,
  operation_type text NOT NULL, -- إدارة وتشغيل، خدمة توصيل، استشارات، صيانة، إلخ
  description text NOT NULL,
  client_id uuid REFERENCES public.partners(id),
  employee_id uuid REFERENCES public.partners(id),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  commission_percentage numeric NOT NULL DEFAULT 0 CHECK (commission_percentage BETWEEN 0 AND 100),
  commission_amount numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  debit_account_id uuid REFERENCES public.accounts(id),
  revenue_account_id uuid REFERENCES public.accounts(id),
  commission_expense_account_id uuid REFERENCES public.accounts(id),
  journal_id uuid REFERENCES public.journal_headers(id),
  status text DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 11. أسطول السيارات ورحلات التوزيع
CREATE TABLE public.fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number text NOT NULL,
  vehicle_model text,
  driver_id uuid REFERENCES public.partners(id),
  status text DEFAULT 'متاح',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.fleet_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number text NOT NULL UNIQUE,
  operation_date date NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id uuid NOT NULL REFERENCES public.fleet_vehicles(id),
  driver_id uuid NOT NULL REFERENCES public.partners(id),
  warehouse_id uuid REFERENCES public.warehouses(id),
  status text DEFAULT 'مفتوح',
  total_sales numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  inventory_cost numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  start_km numeric DEFAULT 0,
  end_km numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

---

## 5. شجرة الحسابات والثوابت المالية الموحدة

النظام يعتمد ملف `d:\waterapp\lib\account-ids.ts` كـ **مصدر وحيد للحقيقة (Single Source of Truth)** لكل معرفات UUID لتفادي أي تضارب:

```typescript
export const ACC = {
  // الأصول المتداولة (12)
  CASH_BOX:                  '21b8a1db-bc9f-4cf8-b741-1efeded0963c', // 122 الخزينة الرئيسية
  CUSTOMERS_AR:              '4f828d0d-a1f4-4762-83e3-c17dafae802d', // 123 العملاء (الذمم المدينة)
  EMPLOYEE_CUSTODY:          'f9c7ba68-6998-48e6-99b3-3a4526d820a1', // 125 عهدة موظفين ومناديب
  INVENTORY:                 'c5efa035-c8d5-4d13-bf33-7c7cd854f393', // 126 مخزون البضائع
  EMPLOYEE_ADVANCES:         '31c9923a-3629-4f3f-b661-b86df51c8e09', // 128 سلف موظفين الشركة
  BANKS:                     'da7ee249-ee43-47da-9e8c-3d623c3f1b50', // 129 حسابات البنوك
  INVENTORY_CUSTODY:         'd133777e-c5f6-42be-b333-ccce6496b97f', // 130 عهدة مخزون السيارات

  // الالتزامات المتداولة (21)
  SUPPLIERS_AP:              '2ca6f54c-5f37-49a0-8c41-e37f94b09752', // 211 الموردون (ذمم دائنة)
  VAT_PAYABLE:               '990c949c-5f32-40d7-8d36-5fe45a6c892c', // 215 ضريبة القيمة المضافة 15%
  ACCRUED_SALARIES:          '39f878cd-dc58-4a2a-a199-50f6fca983d4', // 216 رواتب وأجور وعمولات مستحقة

  // الإيرادات (4)
  SALES_REVENUE:             '6667f91a-9478-49ab-9721-521ee09381fa', // 41 إيرادات المبيعات
  ENGINEERING_SERVICES:      'ce125f8c-5d3b-4cd7-83a9-5d4435e74a51', // 42 إيرادات خدمات تشغيل واستشارات
  OTHER_REVENUE:             '302d8053-a970-4852-8ecb-62fed57dff29', // 44 إيرادات متنوعة وأرباح تشغيل

  // التكاليف والمصروفات (5)
  COGS:                      'e03c1430-0275-424f-8a93-eae8bc8990bf', // 511 تكلفة البضاعة المباعة
  ADMIN_SALARIES:            '27b19f80-f5d7-4877-bfca-361488afd89d', // 521 رواتب ومصروفات عمولات
  TRANSPORT_FUEL:            '24db3969-e42e-488d-ac9e-468a6eba3ef5', // 517 وقود ونقل ومشالات
  MAINTENANCE:               'd363da67-4228-4758-9ed7-1821d62585ac', // 520 صيانة مركبات ومعدات
  ROUNDING_DIFF:             'd5e827b1-4f1a-4c2f-8a03-8d6e7f123456', // 527 عجز وزيادة ورديات وفروق هللات
  WASTE_LOSS:                'a5280000-0000-4000-a000-000000000528', // 528 خسائر توالف وهدر مياه
};
```

---

## 6. دوال قاعدة البيانات والتريجرز (Database RPCs & Triggers)

### دالة إنشاء العملية الخدمية بالقيد المركب:
`create_service_operation_with_journal`
- **الغرض:** حفظ عملية خدمة (توصيل/إدارة/استشارة) وإنشاء قيد مركب رباعي الأطراف وحساب العمولة وصافي الربح في معاملة واحدة (ACID Transaction):
- **الأطراف المحاسبية:**
  1. `Debit`: حساب التحصيل (خزينة/بنك/عميل آجل) بإجمالي قيمة الخدمة.
  2. `Credit`: حساب إيرادات التشغيل بإجمالي قيمة الخدمة.
  3. `Debit`: حساب مصروف العمولات بقيمة عمولة الموظف.
  4. `Credit`: حساب ذمم ومستحقات الموظف (`partner_id`) لإثبات حقه في كشف حسابه.

```sql
CREATE OR REPLACE FUNCTION create_service_operation_with_journal(
    p_operation_date date,
    p_operation_type text,
    p_description text,
    p_client_id uuid,
    p_employee_id uuid,
    p_total_amount numeric,
    p_commission_percentage numeric,
    p_debit_account_id uuid,
    p_revenue_account_id uuid,
    p_commission_expense_account_id uuid,
    p_created_by uuid
)
RETURNS uuid AS $$
DECLARE
    v_commission_amount numeric;
    v_net_profit numeric;
    v_journal_id uuid;
    v_operation_id uuid;
    v_employee_account_id uuid;
BEGIN
    v_commission_amount := (p_total_amount * p_commission_percentage) / 100;
    v_net_profit := p_total_amount - v_commission_amount;

    -- 1. إنشاء رأس القيد
    INSERT INTO public.journal_headers (entry_date, description, status, v_type)
    VALUES (p_operation_date, 'قيد إيراد خدمات تشغيلية: ' || p_operation_type || ' - ' || p_description, 'posted', 'service_revenue')
    RETURNING id INTO v_journal_id;

    -- 2. إثبات الإيراد والتحصيل
    INSERT INTO public.journal_lines (header_id, account_id, debit, credit, partner_id, notes)
    VALUES (v_journal_id, p_debit_account_id, p_total_amount, 0, p_client_id, 'استحقاق/تحصيل إيراد خدمة');

    INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes)
    VALUES (v_journal_id, p_revenue_account_id, 0, p_total_amount, 'إيراد خدمة');

    -- 3. إثبات عمولة الموظف (إن وُجدت)
    IF v_commission_amount > 0 THEN
        SELECT account_id INTO v_employee_account_id FROM public.partners WHERE id = p_employee_id;
        v_employee_account_id := COALESCE(v_employee_account_id, '39f878cd-dc58-4a2a-a199-50f6fca983d4'::uuid);

        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes)
        VALUES (v_journal_id, p_commission_expense_account_id, v_commission_amount, 0, 'مصروف عمولة خدمة للموظف/المندوب');

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_employee_account_id, p_employee_id, 0, v_commission_amount, 'مستحقات عمولة خدمة للموظف/المندوب');
    END IF;

    -- 4. إدراج العملية وربطها بالقيد
    INSERT INTO public.service_operations (
        operation_date, operation_type, description, client_id, employee_id,
        total_amount, commission_percentage, commission_amount, net_profit,
        debit_account_id, revenue_account_id, commission_expense_account_id,
        journal_id, created_by, status
    ) VALUES (
        p_operation_date, p_operation_type, p_description, p_client_id, p_employee_id,
        p_total_amount, p_commission_percentage, v_commission_amount, v_net_profit,
        p_debit_account_id, p_revenue_account_id, p_commission_expense_account_id,
        v_journal_id, p_created_by, 'completed'
    ) RETURNING id INTO v_operation_id;

    RETURN v_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. المعادلات الحسابية والرياضية في النظام

### 1. معادلات فاتورة المبيعات والضريبة:
$$\text{Taxable Amount} = \sum (\text{Qty} \times \text{Unit Price}) - \text{Discount}$$
$$\text{VAT Amount (15\%)} = \text{Taxable Amount} \times 0.15$$
$$\text{Total Invoice Amount} = \text{Taxable Amount} + \text{VAT Amount}$$

### 2. معادلات تسوية وردية الكاشير (POS Shift Reconciliation):
$$\text{Expected Cash} = \text{Starting Cash} + \text{Total Cash Sales} + \text{Receipt Vouchers (Cash)} - \text{Shift Expenses (Cash)}$$
$$\text{Cash Variance (عجز / زيادة)} = \text{Actual Cash (المعدود في الدرج)} - \text{Expected Cash}$$
- إذا كان $\text{Variance} < 0$: يعتبر **عجز نقدية** (يسجل مصروف تسوية عجز أو يخصم من عهدة الكاشير).
- إذا كان $\text{Variance} > 0$: يعتبر **زيادة نقدية** (تسجل إيرادات تسوية متنوعة).

### 3. معادلات قوارير المياه المرتجعة (Empty Bottle Custody):
$$\text{Expected Bottles} = \text{Starting Empty Bottles} + \text{Bottles Returned from Customers} - \text{Bottles Shipped to Plant}$$
$$\text{Bottle Shortage} = \text{Expected Bottles} - \text{Actual Counted Bottles}$$

### 4. معادلات أرباح رحلة التوزيع (Fleet Trip Profitability):
$$\text{Net Trip Profit} = \text{Total Delivered Sales} - \text{COGS (تكلفة مخزون المياه المباعة)} - \text{Trip Fuel \& Maintenance Expenses}$$

### 5. معادلات العمليات الخدمية والعمولات (Service Operations):
$$\text{Commission Amount} = \text{Total Service Amount} \times \left( \frac{\text{Commission \%}}{100} \right)$$
$$\text{Company Net Profit} = \text{Total Service Amount} - \text{Commission Amount}$$

---

## 8. الدورات المستندية والسيناريوهات التشغيلية

### سيناريو 1: دورة مبيعات الكاشير وإغلاق الوردية
1. **فتح الوردية:** الكاشير يفتح الوردية برصيد نقدي افتتاحي (`starting_cash`).
2. **البيع الفوري:** يمسح المنتجات بالكاميرا (صوت تأكيد 1760Hz واهتزاز haptic 80ms).
3. **التأثير المخزني:** يخصم المخزون فوراً من مستودع نقطة البيع (`warehouse_inventory`).
4. **التأثير المالي:** تسجل الفاتورة في جدول `invoices` مربوطة بـ `shift_id`.
5. **إغلاق الوردية:** يدخل الكاشير النقدية الفعلية، يحسب النظام العجز أو الزيادة، ويقفل الوردية مع توليد سند إغلاق رسمي وترحيل القيد المحاسبي المالي.

### سيناريو 2: دورة رحلة سيارة التوزيع (Fleet Operations)
1. **تحميل البضاعة:** تحويل مخزون من المستودع الرئيسي إلى مستودع السيارة (`transfer_out` / `transfer_in`).
2. **تسجيل المبيعات في الطريق:** إصدار فواتير للعملاء بنظام الآجل أو الكاش مع تحديث عهدة القوارير للعميل (`bottle_custody`).
3. **تسجيل مصاريف الخط:** وقود، صيانة طارئة، أو مشالات ترتبط بمعرف الرحلة (`fleet_operation_id`).
4. **تفريغ العائد والإغلاق:** تفريغ الكراتين غير المباعة، جرد القوارير الفارغة المرتجعة، وتوليد قيد تكلفة البضاعة المباعة ومصروفات الرحلة واحتساب صافي ربح السيارة.

### سيناريو 3: دورة العمليات الخدمية والتشغيل للغير (Service Operations)
1. **التسجيل:** إدخال نوع الخدمة (مثال: إدارة موقع لشركة أخرى، أو خدمة نقل وتوصيل شحنة).
2. **اختيار المنفذ والعميل:** ربط العملية بالعميل وبالموظف الذي قام بالعمل.
3. **تحديد النسبة:** تفعيل العمولة للموظف واحتساب صافي ربح المؤسسة فوراً.
4. **التأثير المحاسبي المركب:**
   - تسميع الإيراد وصافي الأرباح في قائمة الدخل.
   - تسميع النقدية في الخزينة أو البنك.
   - إضافة قيمة العمولة فوراً كطرف دائن في كشف حساب الموظف (`/statement?partner_id=...`).

---

## 9. محرك المزامنة اللحظية والشبكة

النظام يحتوي على محرك مزامنة لحظي في `d:\waterapp\lib\useRealtimeSync.tsx` يراقب كافة الجداول الرئيسية:
```typescript
export const WATCHED_TABLES = [
  'notifications', 'messages', 'user_tasks', 'cash_flows',
  'inventory_transactions', 'expenses', 'payment_vouchers',
  'receipt_vouchers', 'invoices', 'journal_headers', 'journal_lines',
  'warehouses', 'partners', 'accounts', 'fleet_operations',
  'service_operations', 'fleet_vehicles', 'pos_shifts'
];
```
عند حدوث أي تعديل في قاعدة البيانات على أي شاشة أو من أي كاشير، يتم بث الحدث عبر WebSocket وتحديث استعلامات React Query المعنية فوراً (`invalidateQueries`) بدون الحاجة لإعادة تحميل الصفحة (F5).

---

> 💡 **طريقة استخدام هذا المستند كـ System Prompt:**
> يمكنك نسخ هذا المستند بالكامل ووضعه كمدخلات أولى (Initial Prompt) لأي وكيل ذكاء اصطناعي ليكون على دراية تامة بكافة أعماق الكود، العلاقات بين الجداول، ثوابت شجرة الحسابات، وقواعد الأكوا جلاسمورفيزم.
