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
    DROP COLUMN IF EXISTS bottle_custody,
    DROP COLUMN IF EXISTS route_name,
    DROP COLUMN IF EXISTS location_lat,
    DROP COLUMN IF EXISTS location_lng;

-- ب. جدول الأصناف والمخزون (inventory_items)
ALTER TABLE public.inventory_items 
    DROP COLUMN IF EXISTS is_returnable_bottle;

-- إضافة عمدان تصنيف الوقود والمنتجات إذا لم تكن موجودة
ALTER TABLE public.inventory_items 
    ADD COLUMN IF NOT EXISTS category text DEFAULT 'fuel',
    ADD COLUMN IF NOT EXISTS fuel_type text DEFAULT NULL;

-- ج. جدول ورديات الكاشير ونقاط البيع (pos_shifts)
ALTER TABLE public.pos_shifts 
    DROP COLUMN IF EXISTS starting_bottles,
    DROP COLUMN IF EXISTS bottles_sold,
    DROP COLUMN IF EXISTS bottles_returned,
    DROP COLUMN IF EXISTS bottles_shortage,
    DROP COLUMN IF EXISTS expected_bottles,
    DROP COLUMN IF EXISTS actual_bottles,
    DROP COLUMN IF EXISTS fleet_operation_id;

-- إضافة عمدان العدادات ومبيعات الوقود اللحظية
ALTER TABLE public.pos_shifts 
    ADD COLUMN IF NOT EXISTS total_liters_sold numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS meter_total_amount numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS meter_sales_variance numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pump_readings jsonb DEFAULT '[]'::jsonb;

-- د. جدول الفواتير (invoices)
ALTER TABLE public.invoices 
    DROP COLUMN IF EXISTS guarantee_percent,
    DROP COLUMN IF EXISTS guarantee_amount,
    DROP COLUMN IF EXISTS materials_discount,
    DROP COLUMN IF EXISTS materials_acc_id,
    DROP COLUMN IF EXISTS guarantee_acc_id,
    DROP COLUMN IF EXISTS job_order_id,
    DROP COLUMN IF EXISTS fleet_operation_id;

-- هـ. جدول المصروفات (expenses)
ALTER TABLE public.expenses 
    DROP COLUMN IF EXISTS sub_contractor,
    DROP COLUMN IF EXISTS site_ref,
    DROP COLUMN IF EXISTS is_deducted_in_claim,
    DROP COLUMN IF EXISTS claim_id,
    DROP COLUMN IF EXISTS job_order_id,
    DROP COLUMN IF EXISTS is_deducted_from_contractor,
    DROP COLUMN IF EXISTS fleet_operation_id;

-- و. جدول سندات القبض (receipt_vouchers)
ALTER TABLE public.receipt_vouchers 
    DROP COLUMN IF EXISTS job_order_id,
    DROP COLUMN IF EXISTS fleet_operation_id;

-- ز. جدول سندات الصرف (payment_vouchers)
ALTER TABLE public.payment_vouchers 
    DROP COLUMN IF EXISTS site_ref,
    DROP COLUMN IF EXISTS related_expense_id,
    DROP COLUMN IF EXISTS sub_claim_id,
    DROP COLUMN IF EXISTS fleet_operation_id;

-- ح. جدول القيود اليدوية (manual_journals)
ALTER TABLE public.manual_journals 
    DROP COLUMN IF EXISTS project_id,
    DROP COLUMN IF EXISTS job_order_id;

-- ط. جدول رؤوس وتفاصيل القيود (journal_headers & journal_lines)
ALTER TABLE public.journal_headers 
    DROP COLUMN IF EXISTS fleet_operation_id;

ALTER TABLE public.journal_lines 
    DROP COLUMN IF EXISTS fleet_operation_id;

-- ي. جدول حركات المخزون (inventory_transactions)
ALTER TABLE public.inventory_transactions 
    DROP COLUMN IF EXISTS fleet_operation_id;

-- ك. جدول المستودعات والخزانات (warehouses)
ALTER TABLE public.warehouses 
    DROP COLUMN IF EXISTS vehicle_id;

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
-- 4. ترقية الدوال التخزينية (RPCs) لدعم محطة الوقود بنقاء
-- ------------------------------------------------------------------------------

-- دالة جلب تفاصيل الوردية النقية بدون أي حقول قوارير
CREATE OR REPLACE FUNCTION get_pos_shift_details(p_shift_id UUID)
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

COMMIT;

-- ==============================================================================
-- انتهى تنفيذ تنقية الاسكيما بنجاح لمؤسسة محطات النور للوقود ⛽⚡
-- ==============================================================================
