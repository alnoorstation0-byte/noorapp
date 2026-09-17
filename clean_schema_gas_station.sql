-- ==============================================================================
-- ⛽ محطات النور للوقود - سكريبت التنقية والتطوير الشامل لقاعدة البيانات
-- NOOR GAS STATIONS - DATABASE PURGE & SCHEMA REFINEMENT
-- ==============================================================================
-- هذا السكريبت يقوم بـ:
-- 1. حذف الجداول الميتة الموروثة من أنشطة سابقة (المقاولات وتوزيع قوارير المياه)
-- 2. حذف العمدان الزائدة والمهملة من الجداول النشطة
-- 3. تأكيد وتثبيت جداول وعمدان محطة الوقود (المضخات، قراءات العدادات، الخزانات)
-- 4. تحديث الدوال والوظائف التخزينية (RPCs) لتعمل بنقاء وبدون أي أخطاء
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. حذف الجداول الميتة غير المستخدمة (Drop Legacy Dead Tables)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.job_orders CASCADE;
DROP TABLE IF EXISTS public.labor_daily_logs CASCADE;
DROP TABLE IF EXISTS public.violations CASCADE;
DROP TABLE IF EXISTS public.service_operations CASCADE;
DROP TABLE IF EXISTS public.vehicle_inventory CASCADE;
DROP TABLE IF EXISTS public.fleet_operations CASCADE;
DROP TABLE IF EXISTS public.fleet_vehicles CASCADE;
DROP TABLE IF EXISTS public.journal_errors CASCADE;
DROP TABLE IF EXISTS public.user_requests CASCADE;
DROP TABLE IF EXISTS public.user_tasks CASCADE;
DROP TABLE IF EXISTS public.sys_financial_reports CASCADE;

-- ------------------------------------------------------------------------------
-- 2. تنقية العمدان الزائدة من الجداول النشطة (Drop Legacy Columns)
-- ------------------------------------------------------------------------------

-- أ. جدول الشركاء والعملاء (partners)
ALTER TABLE public.partners 
    DROP COLUMN IF EXISTS bottle_custody CASCADE,
    DROP COLUMN IF EXISTS route_name CASCADE,
    DROP COLUMN IF EXISTS location_lat CASCADE,
    DROP COLUMN IF EXISTS location_lng CASCADE;

-- ب. جدول الأصناف والمخزون (inventory_items)
ALTER TABLE public.inventory_items 
    DROP COLUMN IF EXISTS is_returnable_bottle CASCADE;

-- إضافة عمدان تصنيف الوقود والمنتجات إذا لم تكن موجودة
ALTER TABLE public.inventory_items 
    ADD COLUMN IF NOT EXISTS category text DEFAULT 'fuel',
    ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT NULL;

-- ج. جدول ورديات الكاشير ونقاط البيع (pos_shifts)
ALTER TABLE public.pos_shifts 
    DROP COLUMN IF EXISTS starting_bottles CASCADE,
    DROP COLUMN IF EXISTS bottles_sold CASCADE,
    DROP COLUMN IF EXISTS bottles_returned CASCADE,
    DROP COLUMN IF EXISTS bottles_shortage CASCADE,
    DROP COLUMN IF EXISTS expected_bottles CASCADE,
    DROP COLUMN IF EXISTS actual_bottles CASCADE,
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- إضافة عمدان العدادات ومبيعات الوقود اللحظية
ALTER TABLE public.pos_shifts 
    ADD COLUMN IF NOT EXISTS total_liters_sold numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS meter_total_amount numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS meter_sales_variance numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pump_readings jsonb DEFAULT '[]'::jsonb;

-- د. جدول الفواتير (invoices)
ALTER TABLE public.invoices 
    DROP COLUMN IF EXISTS guarantee_percent CASCADE,
    DROP COLUMN IF EXISTS guarantee_amount CASCADE,
    DROP COLUMN IF EXISTS materials_discount CASCADE,
    DROP COLUMN IF EXISTS materials_acc_id CASCADE,
    DROP COLUMN IF EXISTS guarantee_acc_id CASCADE,
    DROP COLUMN IF EXISTS job_order_id CASCADE,
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- هـ. جدول المصروفات (expenses)
ALTER TABLE public.expenses 
    DROP COLUMN IF EXISTS sub_contractor CASCADE,
    DROP COLUMN IF EXISTS site_ref CASCADE,
    DROP COLUMN IF EXISTS is_deducted_in_claim CASCADE,
    DROP COLUMN IF EXISTS claim_id CASCADE,
    DROP COLUMN IF EXISTS job_order_id CASCADE,
    DROP COLUMN IF EXISTS is_deducted_from_contractor CASCADE,
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- و. جدول سندات القبض (receipt_vouchers)
ALTER TABLE public.receipt_vouchers 
    DROP COLUMN IF EXISTS job_order_id CASCADE,
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- ز. جدول سندات الصرف (payment_vouchers)
ALTER TABLE public.payment_vouchers 
    DROP COLUMN IF EXISTS site_ref CASCADE,
    DROP COLUMN IF EXISTS related_expense_id CASCADE,
    DROP COLUMN IF EXISTS sub_claim_id CASCADE,
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- ح. جدول القيود اليدوية (manual_journals)
ALTER TABLE public.manual_journals 
    DROP COLUMN IF EXISTS project_id CASCADE,
    DROP COLUMN IF EXISTS job_order_id CASCADE;

-- ط. جدول رؤوس وتفاصيل القيود (journal_headers & journal_lines)
-- إسقاط العرض المتأثر CASCADE أولاً لمنع الخطأ 2BP01
DROP VIEW IF EXISTS public.journal_master_view CASCADE;

ALTER TABLE public.journal_headers 
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

ALTER TABLE public.journal_lines 
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- ي. جدول حركات المخزون (inventory_transactions)
ALTER TABLE public.inventory_transactions 
    DROP COLUMN IF EXISTS fleet_operation_id CASCADE;

-- ك. جدول المستودعات والخزانات (warehouses)
ALTER TABLE public.warehouses 
    DROP COLUMN IF EXISTS vehicle_id CASCADE;

ALTER TABLE public.warehouses 
    ADD COLUMN IF NOT EXISTS tank_capacity_liters numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT NULL;

-- ------------------------------------------------------------------------------
-- 3. تثبيت جداول محطة الوقود الأساسية (Fuel Pumps & Meter Readings)
-- ------------------------------------------------------------------------------

-- جدول مضخات الوقود (fuel_pumps)
CREATE TABLE IF NOT EXISTS public.fuel_pumps (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    pump_number text NOT NULL,
    pump_name text NOT NULL,
    fuel_type text NOT NULL,
    unit_price numeric NOT NULL DEFAULT 0,
    current_meter numeric NOT NULL DEFAULT 0,
    warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
    fuel_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fuel_pumps_pkey PRIMARY KEY (id)
);

-- جدول قراءات عدادات المضخات للوردية (shift_pump_readings)
CREATE TABLE IF NOT EXISTS public.shift_pump_readings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    shift_id uuid NOT NULL REFERENCES public.pos_shifts(id) ON DELETE CASCADE,
    pump_id uuid NOT NULL REFERENCES public.fuel_pumps(id) ON DELETE CASCADE,
    start_reading numeric NOT NULL DEFAULT 0,
    end_reading numeric DEFAULT NULL,
    liters_pumped numeric NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    expected_amount numeric NOT NULL DEFAULT 0,
    invoiced_liters numeric DEFAULT 0,
    variance_liters numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shift_pump_readings_pkey PRIMARY KEY (id),
    CONSTRAINT shift_pump_readings_shift_pump_unique UNIQUE (shift_id, pump_id)
);

-- فهارس السرعة
CREATE INDEX IF NOT EXISTS idx_fuel_pumps_active ON public.fuel_pumps(is_active);
CREATE INDEX IF NOT EXISTS idx_shift_pump_readings_shift ON public.shift_pump_readings(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_pump_readings_pump ON public.shift_pump_readings(pump_id);

-- ------------------------------------------------------------------------------
-- 4. إعادة بناء العرض المحاسبي العام الموحد بدون عمدان الأسطول (journal_master_view)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.journal_master_view AS
SELECT 
    jl.id AS line_id,
    jh.id AS header_id,
    jh.entry_date,
    jh.description AS header_description,
    jh.reference_id,
    jh.v_type,
    jh.status AS header_status,
    jl.account_id,
    a.code AS account_code,
    a.name AS account_name,
    jl.partner_id,
    p.name AS partner_name,
    COALESCE(jl.debit, 0) AS debit,
    COALESCE(jl.credit, 0) AS credit,
    jl.item_name,
    jl.notes AS line_notes,
    jl.tax_amount,
    jl.tax_rate,
    jl.created_at AS line_created_at,
    jl.delegate_id
FROM public.journal_lines jl
JOIN public.journal_headers jh ON jh.id = jl.header_id
LEFT JOIN public.accounts a ON a.id = jl.account_id
LEFT JOIN public.partners p ON p.id = jl.partner_id;

-- ------------------------------------------------------------------------------
-- 5. ترقية دوال ترحيل القيود لتعمل بنقاء بدون أي إشارة لـ fleet_operation_id
-- ------------------------------------------------------------------------------

-- ترحيل الفواتير المجمع
CREATE OR REPLACE FUNCTION public.post_invoices_bulk(p_ids uuid[])
RETURNS void AS $$
DECLARE
    v_inv RECORD;
    v_jh_id uuid;
    v_total numeric;
    v_tax numeric;
    v_taxable numeric;
    v_debit_acc uuid;
    v_credit_acc uuid;
    v_tax_acc uuid;
BEGIN
    FOR v_inv IN SELECT * FROM public.invoices WHERE id = ANY(p_ids)
    LOOP
        IF v_inv.is_posted = true OR v_inv.status IN ('posted', 'معتمد', 'مرحل', 'approved') THEN
            CONTINUE;
        END IF;

        v_total := COALESCE(v_inv.total_amount, 0);
        v_tax := COALESCE(v_inv.tax_amount, 0);
        v_taxable := COALESCE(v_inv.taxable_amount, v_total - v_tax);

        v_debit_acc := v_inv.debit_account_id;
        v_credit_acc := v_inv.credit_account_id;
        v_tax_acc := v_inv.tax_acc_id;

        IF v_debit_acc IS NULL THEN
            SELECT id INTO v_debit_acc FROM public.accounts WHERE code = '1103' OR name LIKE '%عملاء%' OR account_type = 'assets' LIMIT 1;
        END IF;
        IF v_credit_acc IS NULL THEN
            SELECT id INTO v_credit_acc FROM public.accounts WHERE code = '4101' OR name LIKE '%مبيعات%' OR account_type = 'revenues' LIMIT 1;
        END IF;
        IF v_tax_acc IS NULL AND v_tax > 0 THEN
            SELECT id INTO v_tax_acc FROM public.accounts WHERE code = '2105' OR name LIKE '%ضريبة%' OR account_type = 'liabilities' LIMIT 1;
        END IF;

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status)
        VALUES (
            COALESCE(v_inv.date, CURRENT_DATE),
            'فاتورة مبيعات رقم ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
            v_inv.id,
            'invoice',
            'posted'
        )
        RETURNING id INTO v_jh_id;

        IF v_total > 0 AND v_debit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, delegate_id)
            VALUES (
                v_jh_id, v_debit_acc, v_inv.partner_id, v_total, 0,
                'استحقاق فاتورة مبيعات #' || COALESCE(v_inv.invoice_number, ''),
                v_inv.delegate_id
            );
        END IF;

        IF v_taxable > 0 AND v_credit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, delegate_id)
            VALUES (
                v_jh_id, v_credit_acc, v_inv.partner_id, 0, v_taxable,
                'إيراد مبيعات فاتورة #' || COALESCE(v_inv.invoice_number, ''),
                v_inv.delegate_id
            );
        END IF;

        IF v_tax > 0 AND v_tax_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, tax_amount, delegate_id)
            VALUES (
                v_jh_id, v_tax_acc, v_inv.partner_id, 0, v_tax,
                'ضريبة القيمة المضافة فاتورة #' || COALESCE(v_inv.invoice_number, ''),
                v_tax, v_inv.delegate_id
            );
        END IF;

        UPDATE public.invoices 
        SET status = 'معتمد', is_posted = true 
        WHERE id = v_inv.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ترحيل سندات القبض
CREATE OR REPLACE FUNCTION public.post_receipts_bulk(p_ids uuid[])
RETURNS void AS $$
DECLARE
    v_rec RECORD;
    v_jh_id uuid;
    v_amt numeric;
    v_safe_acc uuid;
    v_partner_acc uuid;
BEGIN
    FOR v_rec IN SELECT * FROM public.receipt_vouchers WHERE id = ANY(p_ids)
    LOOP
        IF v_rec.status IN ('posted', 'معتمد', 'مرحل', 'approved') THEN
            CONTINUE;
        END IF;

        v_amt := COALESCE(v_rec.amount, 0);
        v_safe_acc := v_rec.safe_bank_acc_id;
        v_partner_acc := v_rec.partner_acc_id;

        IF v_safe_acc IS NULL THEN
            SELECT id INTO v_safe_acc FROM public.accounts WHERE code IN ('1101', '1102') OR name LIKE '%صندوق%' OR name LIKE '%خزينة%' OR account_type = 'assets' LIMIT 1;
        END IF;
        IF v_partner_acc IS NULL THEN
            SELECT id INTO v_partner_acc FROM public.accounts WHERE code = '1103' OR name LIKE '%عملاء%' OR account_type = 'assets' LIMIT 1;
        END IF;

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status)
        VALUES (
            COALESCE(v_rec.date, CURRENT_DATE),
            'سند قبض رقم ' || COALESCE(v_rec.receipt_number, v_rec.id::text) || COALESCE(' - ' || v_rec.notes, ''),
            v_rec.id,
            'receipt',
            'posted'
        )
        RETURNING id INTO v_jh_id;

        IF v_amt > 0 AND v_safe_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, delegate_id)
            VALUES (
                v_jh_id, v_safe_acc, v_rec.partner_id, v_amt, 0,
                'تحصيل نقدية سند قبض #' || COALESCE(v_rec.receipt_number, ''),
                v_rec.delegate_id
            );
        END IF;

        IF v_amt > 0 AND v_partner_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, delegate_id)
            VALUES (
                v_jh_id, v_partner_acc, v_rec.partner_id, 0, v_amt,
                'سداد عميل سند قبض #' || COALESCE(v_rec.receipt_number, ''),
                v_rec.delegate_id
            );
        END IF;

        UPDATE public.receipt_vouchers 
        SET status = 'معتمد' 
        WHERE id = v_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ترحيل سندات الصرف
CREATE OR REPLACE FUNCTION public.post_payment_vouchers_bulk(p_ids uuid[])
RETURNS void AS $$
DECLARE
    v_pv RECORD;
    v_jh_id uuid;
    v_amt numeric;
    v_debit_acc uuid;
    v_credit_acc uuid;
BEGIN
    FOR v_pv IN SELECT * FROM public.payment_vouchers WHERE id = ANY(p_ids)
    LOOP
        IF v_pv.is_posted = true OR v_pv.status IN ('posted', 'معتمد', 'مرحل', 'approved') THEN
            CONTINUE;
        END IF;

        v_amt := COALESCE(v_pv.amount, 0);
        v_debit_acc := v_pv.debit_account_id;
        v_credit_acc := v_pv.credit_account_id;

        IF v_debit_acc IS NULL THEN
            SELECT id INTO v_debit_acc FROM public.accounts WHERE code = '2101' OR name LIKE '%موردين%' OR account_type IN ('liabilities', 'expenses') LIMIT 1;
        END IF;
        IF v_credit_acc IS NULL THEN
            SELECT id INTO v_credit_acc FROM public.accounts WHERE code IN ('1101', '1102') OR name LIKE '%صندوق%' OR name LIKE '%بنك%' OR account_type = 'assets' LIMIT 1;
        END IF;

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status)
        VALUES (
            COALESCE(v_pv.date, CURRENT_DATE),
            'سند صرف رقم ' || COALESCE(v_pv.voucher_number, v_pv.id::text) || COALESCE(' - ' || v_pv.description, ''),
            v_pv.id,
            'payment_voucher',
            'posted'
        )
        RETURNING id INTO v_jh_id;

        IF v_amt > 0 AND v_debit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (
                v_jh_id, v_debit_acc, v_pv.partner_id, v_amt, 0,
                'سند صرف #' || COALESCE(v_pv.voucher_number, '')
            );
        END IF;

        IF v_amt > 0 AND v_credit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (
                v_jh_id, v_credit_acc, NULL, 0, v_amt,
                'سداد سند صرف #' || COALESCE(v_pv.voucher_number, '')
            );
        END IF;

        UPDATE public.payment_vouchers 
        SET status = 'معتمد', is_posted = true 
        WHERE id = v_pv.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ترحيل المصروف المفرد
CREATE OR REPLACE FUNCTION public.post_expense_to_journal(p_expense_id UUID)
RETURNS void AS $$
DECLARE
    v_expense RECORD;
    v_journal_id UUID;
    v_debit_acc UUID;
    v_credit_acc UUID;
    v_total_amount NUMERIC;
BEGIN
    SELECT * INTO v_expense FROM public.expenses WHERE id = p_expense_id;

    IF v_expense.is_posted THEN
        RAISE EXCEPTION 'هذا المصروف مرحّل مسبقاً ولا يمكن ترحيله مرة أخرى';
    END IF;

    v_total_amount := COALESCE(v_expense.total_price, (v_expense.quantity * v_expense.unit_price)) + COALESCE(v_expense.vat_amount, 0);

    SELECT id INTO v_debit_acc FROM public.accounts WHERE code = split_part(v_expense.creditor_account, ' - ', 1) LIMIT 1;
    SELECT id INTO v_credit_acc FROM public.accounts WHERE code = split_part(v_expense.payment_account, ' - ', 1) LIMIT 1;

    IF v_debit_acc IS NULL THEN
        SELECT id INTO v_debit_acc FROM public.accounts WHERE account_type = 'expenses' LIMIT 1;
    END IF;
    IF v_credit_acc IS NULL THEN
        SELECT id INTO v_credit_acc FROM public.accounts WHERE account_type = 'assets' LIMIT 1;
    END IF;

    INSERT INTO public.journal_headers (entry_date, description, reference_id, status)
    VALUES (v_expense.exp_date, 'قيد مصروف آلي: ' || v_expense.description, v_expense.id, 'posted')
    RETURNING id INTO v_journal_id;

    INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes, partner_id)
    VALUES (v_journal_id, v_debit_acc, v_total_amount, 0, v_expense.description, v_expense.payee_id);

    INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes, partner_id)
    VALUES (v_journal_id, v_credit_acc, 0, v_total_amount, 'سداد مصروف: ' || v_expense.description, v_expense.payee_id);

    UPDATE public.expenses SET is_posted = true WHERE id = p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. ترقية الدوال التخزينية الخاصة بالورديات ومحطة الوقود بنقاء
-- ------------------------------------------------------------------------------

-- دالة جلب تفاصيل الوردية النقية بدون أي حقول قوارير
DROP FUNCTION IF EXISTS public.get_pos_shift_details(UUID);
CREATE OR REPLACE FUNCTION public.get_pos_shift_details(p_shift_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_shift RECORD;
    v_warehouse RECORD;
    v_delegate RECORD;
    v_profile RECORD;
    v_invoices jsonb := '[]'::jsonb;
    v_items_summary jsonb := '[]'::jsonb;
    v_pump_readings jsonb := '[]'::jsonb;
    v_receipts jsonb := '[]'::jsonb;
    v_result jsonb;
BEGIN
    -- 1. جلب بيانات الوردية الأساسية
    SELECT * INTO v_shift
    FROM pos_shifts
    WHERE id = p_shift_id;

    IF v_shift IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. جلب بيانات الخزان / منفذ البيع
    SELECT id, name, type, location, phone INTO v_warehouse
    FROM warehouses
    WHERE id = v_shift.warehouse_id;

    -- 3. جلب بيانات المسؤول / المندوب
    SELECT id, name, phone, code, vat_number INTO v_delegate
    FROM partners
    WHERE id = v_shift.delegate_id;

    -- 4. جلب بيانات الكاشير
    SELECT id, full_name, username, email INTO v_profile
    FROM profiles
    WHERE id = v_shift.user_id;

    -- 5. جلب فواتير الوردية
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', inv.id,
            'invoice_number', inv.invoice_number,
            'date', inv.date,
            'created_at', inv.created_at,
            'client_name', COALESCE(inv.client_name, 'عميل نقدي'),
            'partner_id', inv.partner_id,
            'total_amount', COALESCE(inv.total_amount, 0),
            'tax_amount', COALESCE(inv.tax_amount, 0),
            'taxable_amount', COALESCE(inv.taxable_amount, 0),
            'paid_amount', COALESCE(inv.paid_amount, 0),
            'payment_method', inv.payment_method,
            'status', inv.status,
            'lines_count', jsonb_array_length(COALESCE(inv.lines_data, '[]'::jsonb))
        ) ORDER BY inv.created_at DESC
    ), '[]'::jsonb)
    INTO v_invoices
    FROM invoices inv
    WHERE inv.shift_id = p_shift_id AND inv.status != 'ملغي';

    -- 6. تجميع أصناف الوقود والمنتجات المباعة
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'item_id', item_grp.item_id,
            'item_name', item_grp.item_name,
            'total_quantity', item_grp.total_qty,
            'avg_price', CASE WHEN item_grp.total_qty > 0 THEN ROUND(item_grp.total_amount / item_grp.total_qty, 2) ELSE 0 END,
            'total_amount', item_grp.total_amount
        ) ORDER BY item_grp.total_qty DESC
    ), '[]'::jsonb)
    INTO v_items_summary
    FROM (
        SELECT 
            COALESCE(line->>'item_id', line->>'id') AS item_id,
            COALESCE(line->>'name', line->'inventory_items'->>'name', 'صنف') AS item_name,
            SUM(COALESCE((line->>'quantity')::numeric, (line->>'qty')::numeric, 0)) AS total_qty,
            SUM(COALESCE((line->>'total')::numeric, (line->>'total_price')::numeric, 
                COALESCE((line->>'quantity')::numeric, (line->>'qty')::numeric, 0) * COALESCE((line->>'unit_price')::numeric, (line->>'price')::numeric, (line->>'selected_price')::numeric, 0))) AS total_amount
        FROM invoices inv,
             jsonb_array_elements(COALESCE(inv.lines_data, '[]'::jsonb)) AS line
        WHERE inv.shift_id = p_shift_id AND inv.status != 'ملغي'
        GROUP BY COALESCE(line->>'item_id', line->>'id'), COALESCE(line->>'name', line->'inventory_items'->>'name', 'صنف')
    ) item_grp;

    -- 7. جلب قراءات عدادات المضخات للوردية
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', spr.id,
            'pump_id', spr.pump_id,
            'pump_number', fp.pump_number,
            'pump_name', fp.pump_name,
            'fuel_type', fp.fuel_type,
            'unit_price', spr.unit_price,
            'start_reading', spr.start_reading,
            'end_reading', spr.end_reading,
            'liters_pumped', spr.liters_pumped,
            'expected_amount', spr.expected_amount,
            'variance_liters', spr.variance_liters
        ) ORDER BY fp.pump_number
    ), '[]'::jsonb)
    INTO v_pump_readings
    FROM shift_pump_readings spr
    JOIN fuel_pumps fp ON fp.id = spr.pump_id
    WHERE spr.shift_id = p_shift_id;

    -- 8. تكوين ملف الوردية النهائي
    v_result := jsonb_build_object(
        'shift_id', v_shift.id,
        'status', v_shift.status,
        'opened_at', v_shift.opened_at,
        'closed_at', v_shift.closed_at,
        'created_at', v_shift.created_at,
        'duration_minutes', CASE 
            WHEN v_shift.closed_at IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (v_shift.closed_at - v_shift.opened_at)) / 60)
            ELSE ROUND(EXTRACT(EPOCH FROM (NOW() - v_shift.opened_at)) / 60)
        END,
        'warehouse', jsonb_build_object(
            'id', v_warehouse.id,
            'name', COALESCE(v_warehouse.name, 'الفرع الرئيسي للمحطة'),
            'type', v_warehouse.type
        ),
        'delegate', jsonb_build_object(
            'id', v_delegate.id,
            'name', COALESCE(v_delegate.name, 'مبيعات مباشرة'),
            'phone', v_delegate.phone,
            'code', v_delegate.code
        ),
        'cashier', jsonb_build_object(
            'id', v_shift.user_id,
            'name', COALESCE(v_profile.full_name, v_profile.username, v_profile.email, 'كاشير المحطة')
        ),
        'financials', jsonb_build_object(
            'starting_cash', COALESCE(v_shift.starting_cash, 0),
            'expected_cash', COALESCE(v_shift.expected_cash, 0),
            'actual_cash', COALESCE(v_shift.actual_cash, 0),
            'shortage_overage', COALESCE(v_shift.shortage_overage, 0),
            'total_sales', COALESCE(v_shift.total_sales, 0),
            'total_cash_sales', COALESCE(v_shift.total_cash_sales, 0),
            'total_card_sales', COALESCE(v_shift.total_card_sales, 0),
            'total_credit_sales', COALESCE(v_shift.total_credit_sales, 0),
            'total_liters_sold', COALESCE(v_shift.total_liters_sold, 0),
            'meter_total_amount', COALESCE(v_shift.meter_total_amount, 0),
            'meter_sales_variance', COALESCE(v_shift.meter_sales_variance, 0)
        ),
        'pump_readings', v_pump_readings,
        'invoices_count', jsonb_array_length(v_invoices),
        'invoices', v_invoices,
        'items_summary', v_items_summary
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. تحديث وتطهير دالة حفظ المصروفات (Cleaned save_expense_with_settlement)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.save_expense_with_settlement;
CREATE OR REPLACE FUNCTION public.save_expense_with_settlement(
    p_id uuid,
    p_exp_date date,
    p_main_category text,
    p_sub_contractor text DEFAULT NULL,
    p_site_ref text DEFAULT NULL,
    p_creditor_account text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_payee_name text DEFAULT NULL,
    p_payment_method text DEFAULT 'آجل',
    p_payment_account text DEFAULT NULL,
    p_employee_name text DEFAULT NULL,
    p_quantity numeric DEFAULT 1,
    p_unit_price numeric DEFAULT 0,
    p_vat_amount numeric DEFAULT 0,
    p_discount_amount numeric DEFAULT 0,
    p_discount_account text DEFAULT NULL,
    p_notes text DEFAULT NULL,
    p_invoice_image text DEFAULT NULL,
    p_lines_data jsonb DEFAULT '[]'::jsonb,
    p_is_auto_distributed boolean DEFAULT false,
    p_payee_id uuid DEFAULT NULL,
    p_job_order_id uuid DEFAULT NULL,
    p_is_deducted_from_contractor boolean DEFAULT false
) RETURNS jsonb AS $$
DECLARE
    generated_expense_number text;
    first_inserted_id uuid;
    line_record jsonb;
    current_line_qty numeric;
    current_line_price numeric;
    current_line_vat numeric;
    current_line_disc numeric;
    current_line_desc text;
    lines_array jsonb;
BEGIN
    IF p_id IS NULL THEN
        generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    ELSE
        SELECT expense_number INTO generated_expense_number FROM public.expenses WHERE id = p_id LIMIT 1;
        IF generated_expense_number IS NOT NULL THEN
            DELETE FROM public.expenses WHERE expense_number = generated_expense_number;
        ELSE
            generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
        END IF;
    END IF;

    IF p_lines_data IS NULL OR jsonb_array_length(p_lines_data) = 0 THEN
        lines_array := jsonb_build_array(
            jsonb_build_object(
                'description', p_description,
                'quantity', p_quantity,
                'unit_price', p_unit_price,
                'vat_amount', p_vat_amount,
                'discount_amount', p_discount_amount
            )
        );
    ELSE
        lines_array := p_lines_data;
    END IF;

    FOR line_record IN SELECT * FROM jsonb_array_elements(lines_array)
    LOOP
        current_line_desc := COALESCE(line_record->>'description', line_record->>'item_name', line_record->>'work_item', p_description);
        current_line_qty := COALESCE((line_record->>'quantity')::numeric, 1);
        current_line_price := COALESCE((line_record->>'unit_price')::numeric, 0);
        current_line_vat := COALESCE((line_record->>'vat_amount')::numeric, 0);
        current_line_disc := COALESCE((line_record->>'discount_amount')::numeric, 0);

        INSERT INTO public.expenses (
            expense_number,
            exp_date,
            main_category,
            creditor_account,
            description,
            payee_name,
            payment_method,
            payment_account,
            employee_name,
            quantity,
            unit_price,
            vat_amount,
            discount_amount,
            discount_account,
            notes,
            invoice_image,
            is_auto_distributed,
            payee_id,
            lines_data
        ) VALUES (
            generated_expense_number,
            p_exp_date,
            p_main_category,
            p_creditor_account,
            current_line_desc,
            p_payee_name,
            p_payment_method,
            p_payment_account,
            p_employee_name,
            current_line_qty,
            current_line_price,
            current_line_vat,
            current_line_disc,
            p_discount_account,
            p_notes,
            p_invoice_image,
            p_is_auto_distributed,
            p_payee_id,
            '[]'::jsonb
        ) RETURNING id INTO first_inserted_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'expense_number', generated_expense_number,
        'id', first_inserted_id 
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ==============================================================================
-- انتهى تنفيذ تنقية الاسكيما بنجاح لمؤسسة محطات النور للوقود ⛽⚡
-- ==============================================================================
