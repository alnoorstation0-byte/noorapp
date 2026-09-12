-- ==============================================================================
-- 🚀 نظام تفاصيل ومراجعة الورديات (POS Shift Details & Audit Engine)
-- متوافق 100% مع سكيما قاعدة البيانات ونظام نقاط البيع
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. دالة جلب تفاصيل الوردية الشاملة (Shift Details & Audit Dossier)
-- ترجع كائن JSON متكامل يحتوي على:
--  - بيانات الوردية والمنفذ والمندوب والكاشير
--  - المطابقة المالية للصندوق (العهدة، الكاش، الشبكة، الآجل، العجز/الزيادة)
--  - جرد فوارغ العبوات والجالونات
--  - قائمة الفواتير الصادرة بالكامل
--  - تقرير مجمع بالأصناف المباعة والكميات والقيم
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pos_shift_details(p_shift_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_shift RECORD;
    v_warehouse RECORD;
    v_delegate RECORD;
    v_profile RECORD;
    v_invoices jsonb := '[]'::jsonb;
    v_items_summary jsonb := '[]'::jsonb;
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

    -- 2. جلب بيانات المستودع / منفذ البيع
    SELECT id, name, type, location, phone, vehicle_id INTO v_warehouse
    FROM warehouses
    WHERE id = v_shift.warehouse_id;

    -- 3. جلب بيانات المندوب المسؤول
    SELECT id, name, phone, code, vat_number INTO v_delegate
    FROM partners
    WHERE id = v_shift.delegate_id;

    -- 4. جلب بيانات الكاشير / المستخدم
    SELECT id, full_name, username, email INTO v_profile
    FROM profiles
    WHERE id = v_shift.user_id;

    -- 5. جلب قائمة الفواتير التابعة للوردية
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
            'fleet_operation_id', inv.fleet_operation_id,
            'lines_count', jsonb_array_length(COALESCE(inv.lines_data, '[]'::jsonb))
        ) ORDER BY inv.created_at DESC
    ), '[]'::jsonb)
    INTO v_invoices
    FROM invoices inv
    WHERE inv.shift_id = p_shift_id;

    -- 6. تجميع الأصناف المباعة خلال الوردية بالكامل من lines_data
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
        WHERE inv.shift_id = p_shift_id
        GROUP BY COALESCE(line->>'item_id', line->>'id'), COALESCE(line->>'name', line->'inventory_items'->>'name', 'صنف')
    ) item_grp;

    -- 7. جلب أي سندات قبض مرتبطة بهذه الفواتير
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', rc.id,
            'receipt_number', rc.receipt_number,
            'amount', rc.amount,
            'payment_method', rc.payment_method,
            'date', rc.date
        ) ORDER BY rc.created_at DESC
    ), '[]'::jsonb)
    INTO v_receipts
    FROM receipt_vouchers rc
    WHERE rc.invoice_id IN (
        SELECT id FROM invoices WHERE shift_id = p_shift_id
    );

    -- 8. تكوين ملف المراجعة المتكامل للوردية
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
            'name', COALESCE(v_warehouse.name, 'مستودع غير محدد'),
            'type', v_warehouse.type
        ),
        'delegate', jsonb_build_object(
            'id', v_delegate.id,
            'name', COALESCE(v_delegate.name, 'مبيعات مباشرة (بدون مندوب)'),
            'phone', v_delegate.phone,
            'code', v_delegate.code
        ),
        'cashier', jsonb_build_object(
            'id', v_shift.user_id,
            'name', COALESCE(v_profile.full_name, v_profile.username, v_profile.email, 'كاشير النظام')
        ),
        'financials', jsonb_build_object(
            'starting_cash', COALESCE(v_shift.starting_cash, 0),
            'expected_cash', COALESCE(v_shift.expected_cash, 0),
            'actual_cash', COALESCE(v_shift.actual_cash, 0),
            'shortage_overage', COALESCE(v_shift.shortage_overage, 0),
            'total_sales', COALESCE(v_shift.total_sales, 0),
            'total_cash_sales', COALESCE(v_shift.total_cash_sales, 0),
            'total_card_sales', COALESCE(v_shift.total_card_sales, 0),
            'total_credit_sales', COALESCE(v_shift.total_credit_sales, 0)
        ),
        'bottles', jsonb_build_object(
            'sold', COALESCE(v_shift.bottles_sold, 0),
            'returned', COALESCE(v_shift.bottles_returned, 0),
            'shortage', COALESCE(v_shift.bottles_shortage, 0)
        ),
        'invoices_count', jsonb_array_length(v_invoices),
        'invoices', v_invoices,
        'items_summary', v_items_summary,
        'receipts', v_receipts
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 2. دالة استعراض وتصفية سجل الورديات للتدقيق والمراجعة
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pos_shifts_list(
    p_status TEXT DEFAULT NULL,
    p_warehouse_id UUID DEFAULT NULL,
    p_delegate_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    status VARCHAR,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    warehouse_id UUID,
    warehouse_name VARCHAR,
    warehouse_type VARCHAR,
    delegate_id UUID,
    delegate_name VARCHAR,
    cashier_name TEXT,
    starting_cash NUMERIC,
    expected_cash NUMERIC,
    actual_cash NUMERIC,
    shortage_overage NUMERIC,
    total_sales NUMERIC,
    total_cash_sales NUMERIC,
    total_card_sales NUMERIC,
    total_credit_sales NUMERIC,
    bottles_sold NUMERIC,
    bottles_returned NUMERIC,
    bottles_shortage NUMERIC,
    invoices_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.status,
        s.opened_at,
        s.closed_at,
        s.warehouse_id,
        COALESCE(w.name, 'مستودع غير محدد')::VARCHAR AS warehouse_name,
        COALESCE(w.type, 'main')::VARCHAR AS warehouse_type,
        s.delegate_id,
        COALESCE(d.name, 'مبيعات مباشرة')::VARCHAR AS delegate_name,
        COALESCE(p.full_name, p.username, p.email, 'كاشير')::TEXT AS cashier_name,
        s.starting_cash,
        s.expected_cash,
        s.actual_cash,
        s.shortage_overage,
        s.total_sales,
        s.total_cash_sales,
        s.total_card_sales,
        s.total_credit_sales,
        s.bottles_sold,
        s.bottles_returned,
        s.bottles_shortage,
        (SELECT COUNT(*) FROM invoices inv WHERE inv.shift_id = s.id) AS invoices_count
    FROM pos_shifts s
    LEFT JOIN warehouses w ON w.id = s.warehouse_id
    LEFT JOIN partners d ON d.id = s.delegate_id
    LEFT JOIN profiles p ON p.id = s.user_id
    WHERE (p_status IS NULL OR s.status = p_status)
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
      AND (p_delegate_id IS NULL OR s.delegate_id = p_delegate_id)
      AND (p_start_date IS NULL OR s.opened_at >= p_start_date)
      AND (p_end_date IS NULL OR s.opened_at <= p_end_date)
    ORDER BY s.opened_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 3. صلاحيات استدعاء الدوال لمستخدمي النظام الموثقين
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_pos_shift_details(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_pos_shifts_list(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated, service_role, anon;
