-- ==============================================================================
-- 👑 TAJ MAWADAH ERP - MASTER DATABASE SCHEMA, RPCS & VIEWS
-- ميثاق الاستقرار والسيادة المحاسبية - الإصدار الموحد النهائي V12
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. جدول العروض الترويجية (Promotions Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'active' NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    conditions jsonb DEFAULT '{}'::jsonb,
    rewards jsonb DEFAULT '{}'::jsonb,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.promotions;
CREATE POLICY "Enable all access for authenticated users" ON public.promotions
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. عروض قاعدة البيانات الحيوية (Core Accounting & Operational Views)
-- ------------------------------------------------------------------------------

-- 2.1 الدفتر المحاسبي العام الموحد (journal_master_view)
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
    COALESCE(jl.fleet_operation_id, jh.fleet_operation_id) AS fleet_operation_id,
    jl.delegate_id
FROM public.journal_lines jl
JOIN public.journal_headers jh ON jh.id = jl.header_id
LEFT JOIN public.accounts a ON a.id = jl.account_id
LEFT JOIN public.partners p ON p.id = jl.partner_id;

-- 2.2 ملخص حسابات وأرصدة جميع الشركاء (all_partners_account_summary)
CREATE OR REPLACE VIEW public.all_partners_account_summary AS
SELECT 
    p.id AS partner_id,
    p.name AS partner_name,
    p.partner_type,
    p.phone,
    COALESCE(SUM(jl.debit), 0) AS total_debit,
    COALESCE(SUM(jl.credit), 0) AS total_credit,
    COALESCE(SUM(jl.debit), 0) AS total_earned,
    COALESCE(SUM(jl.credit), 0) AS total_paid,
    COALESCE(SUM(jl.debit - jl.credit), 0) AS net_balance,
    COALESCE(SUM(jl.debit - jl.credit), 0) AS current_balance
FROM public.partners p
LEFT JOIN public.journal_lines jl ON jl.partner_id = p.id
GROUP BY p.id, p.name, p.partner_type, p.phone;

-- 2.3 دفتر أستاذ كشوف حسابات الشركاء (partner_statement_ledger)
CREATE OR REPLACE VIEW public.partner_statement_ledger AS
SELECT 
    jl.id AS line_id,
    jl.partner_id,
    p.name AS partner_name,
    p.partner_type,
    jh.entry_date AS transaction_date,
    COALESCE(jl.debit, 0) AS debit,
    COALESCE(jl.credit, 0) AS credit,
    jh.description AS main_description,
    COALESCE(jl.notes, jl.item_name) AS line_details,
    jh.v_type,
    jh.reference_id,
    jl.quantity AS attendance_value
FROM public.journal_lines jl
JOIN public.journal_headers jh ON jh.id = jl.header_id
LEFT JOIN public.partners p ON p.id = jl.partner_id
WHERE jl.partner_id IS NOT NULL;

-- 2.4 رادار تدقيق القيود والأخطاء (vw_advanced_audit)
CREATE OR REPLACE VIEW public.vw_advanced_audit AS
SELECT 
    jh.id::text AS error_id,
    jh.id AS header_id,
    'unbalanced' AS error_type,
    jh.entry_date AS error_date,
    jh.v_type AS source_type,
    'journal_headers' AS table_name,
    'قيد محاسبي غير متزن: ' || jh.description AS details,
    ABS(SUM(COALESCE(jl.debit, 0)) - SUM(COALESCE(jl.credit, 0))) AS diff_amount
FROM public.journal_headers jh
JOIN public.journal_lines jl ON jl.header_id = jh.id
GROUP BY jh.id, jh.entry_date, jh.v_type, jh.description
HAVING ABS(SUM(COALESCE(jl.debit, 0)) - SUM(COALESCE(jl.credit, 0))) > 0.05
UNION ALL
SELECT 
    jl.id::text AS error_id,
    jl.header_id,
    'orphan' AS error_type,
    jl.created_at::date AS error_date,
    'journal_lines' AS source_type,
    'journal_lines' AS table_name,
    'سطر قيد يتيم بدون رأس قيد' AS details,
    COALESCE(jl.debit, jl.credit, 0) AS diff_amount
FROM public.journal_lines jl
WHERE jl.header_id NOT IN (SELECT id FROM public.journal_headers)
UNION ALL
SELECT 
    jl.id::text AS error_id,
    jl.header_id,
    'missing' AS error_type,
    jl.created_at::date AS error_date,
    'journal_lines' AS source_type,
    'journal_lines' AS table_name,
    'سطر قيد بدون توجيه لحساب مالي' AS details,
    COALESCE(jl.debit, jl.credit, 0) AS diff_amount
FROM public.journal_lines jl
WHERE jl.account_id IS NULL;

-- 2.5 بنود أوامر التشغيل والمقايسات (boq_budget_distinct)
CREATE OR REPLACE VIEW public.boq_budget_distinct AS
SELECT 
    jo.id,
    jo.id AS project_id,
    COALESCE(jo.job_order_number, jo.id::text) AS work_item,
    COALESCE(jo.job_order_number || ' - ' || jo.description, jo.id::text) AS display_name
FROM public.job_orders jo;

-- ------------------------------------------------------------------------------
-- 3. دوال ترحيل وفك ترحيل وحذف الفواتير (Invoices RPCs)
-- ------------------------------------------------------------------------------

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

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status, fleet_operation_id)
        VALUES (
            COALESCE(v_inv.date, CURRENT_DATE),
            'فاتورة مبيعات رقم ' || COALESCE(v_inv.invoice_number, v_inv.id::text),
            v_inv.id,
            'invoice',
            'posted',
            v_inv.fleet_operation_id
        )
        RETURNING id INTO v_jh_id;

        IF v_total > 0 AND v_debit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id, delegate_id)
            VALUES (
                v_jh_id, v_debit_acc, v_inv.partner_id, v_total, 0,
                'استحقاق فاتورة مبيعات #' || COALESCE(v_inv.invoice_number, ''),
                v_inv.fleet_operation_id, v_inv.delegate_id
            );
        END IF;

        IF v_taxable > 0 AND v_credit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id, delegate_id)
            VALUES (
                v_jh_id, v_credit_acc, v_inv.partner_id, 0, v_taxable,
                'إيراد مبيعات فاتورة #' || COALESCE(v_inv.invoice_number, ''),
                v_inv.fleet_operation_id, v_inv.delegate_id
            );
        END IF;

        IF v_tax > 0 AND v_tax_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, tax_amount, fleet_operation_id, delegate_id)
            VALUES (
                v_jh_id, v_tax_acc, v_inv.partner_id, 0, v_tax,
                'ضريبة القيمة المضافة فاتورة #' || COALESCE(v_inv.invoice_number, ''),
                v_tax, v_inv.fleet_operation_id, v_inv.delegate_id
            );
        END IF;

        UPDATE public.invoices 
        SET status = 'معتمد', is_posted = true 
        WHERE id = v_inv.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unpost_invoices_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE header_id IN (
        SELECT id FROM public.journal_headers WHERE reference_id = ANY(p_ids)
    );
    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids);

    UPDATE public.invoices 
    SET status = 'مسودة', is_posted = false 
    WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_invoices_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    PERFORM public.unpost_invoices_bulk(p_ids);
    DELETE FROM public.invoices WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. دوال ترحيل وفك ترحيل وحذف المصروفات (Expenses RPCs)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_expenses_bulk(p_ids uuid[])
RETURNS void AS $$
DECLARE
    v_id uuid;
BEGIN
    FOREACH v_id IN ARRAY p_ids
    LOOP
        BEGIN
            PERFORM public.post_expense_to_journal(v_id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unpost_expenses_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE header_id IN (
        SELECT id FROM public.journal_headers WHERE reference_id = ANY(p_ids)
    );
    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids);

    UPDATE public.expenses 
    SET is_posted = false 
    WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_expenses_bulk(record_ids uuid[])
RETURNS void AS $$
BEGIN
    PERFORM public.unpost_expenses_bulk(record_ids);
    DELETE FROM public.expenses WHERE id = ANY(record_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. دوال ترحيل وفك ترحيل وحذف سندات القبض والصرف (Vouchers RPCs)
-- ------------------------------------------------------------------------------

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

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status, fleet_operation_id)
        VALUES (
            COALESCE(v_rec.date, CURRENT_DATE),
            'سند قبض رقم ' || COALESCE(v_rec.receipt_number, v_rec.id::text) || COALESCE(' - ' || v_rec.notes, ''),
            v_rec.id,
            'receipt',
            'posted',
            v_rec.fleet_operation_id
        )
        RETURNING id INTO v_jh_id;

        IF v_amt > 0 AND v_safe_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id, delegate_id)
            VALUES (
                v_jh_id, v_safe_acc, v_rec.partner_id, v_amt, 0,
                'تحصيل نقدية سند قبض #' || COALESCE(v_rec.receipt_number, ''),
                v_rec.fleet_operation_id, v_rec.delegate_id
            );
        END IF;

        IF v_amt > 0 AND v_partner_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id, delegate_id)
            VALUES (
                v_jh_id, v_partner_acc, v_rec.partner_id, 0, v_amt,
                'سداد عميل سند قبض #' || COALESCE(v_rec.receipt_number, ''),
                v_rec.fleet_operation_id, v_rec.delegate_id
            );
        END IF;

        UPDATE public.receipt_vouchers 
        SET status = 'معتمد' 
        WHERE id = v_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unpost_receipts_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE header_id IN (
        SELECT id FROM public.journal_headers WHERE reference_id = ANY(p_ids)
    );
    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids);

    UPDATE public.receipt_vouchers 
    SET status = 'مسودة' 
    WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_receipts_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    PERFORM public.unpost_receipts_bulk(p_ids);
    DELETE FROM public.receipt_vouchers WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

        INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status, fleet_operation_id)
        VALUES (
            COALESCE(v_pv.date, CURRENT_DATE),
            'سند صرف رقم ' || COALESCE(v_pv.voucher_number, v_pv.id::text) || COALESCE(' - ' || v_pv.description, ''),
            v_pv.id,
            'payment_voucher',
            'posted',
            v_pv.fleet_operation_id
        )
        RETURNING id INTO v_jh_id;

        IF v_amt > 0 AND v_debit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id)
            VALUES (
                v_jh_id, v_debit_acc, v_pv.partner_id, v_amt, 0,
                'سند صرف #' || COALESCE(v_pv.voucher_number, ''),
                v_pv.fleet_operation_id
            );
        END IF;

        IF v_amt > 0 AND v_credit_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes, fleet_operation_id)
            VALUES (
                v_jh_id, v_credit_acc, NULL, 0, v_amt,
                'سداد سند صرف #' || COALESCE(v_pv.voucher_number, ''),
                v_pv.fleet_operation_id
            );
        END IF;

        UPDATE public.payment_vouchers 
        SET status = 'معتمد', is_posted = true 
        WHERE id = v_pv.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unpost_payment_vouchers_bulk(p_ids uuid[])
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE header_id IN (
        SELECT id FROM public.journal_headers WHERE reference_id = ANY(p_ids)
    );
    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids);

    UPDATE public.payment_vouchers 
    SET status = 'مسودة', is_posted = false 
    WHERE id = ANY(p_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.unpost_universal_bulk(p_ids uuid[], p_table_name text)
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE header_id IN (
        SELECT id FROM public.journal_headers WHERE reference_id = ANY(p_ids)
    );
    DELETE FROM public.journal_headers WHERE reference_id = ANY(p_ids);

    EXECUTE format('UPDATE public.%I SET status = ''مسودة'', is_posted = false WHERE id = ANY($1)', p_table_name)
    USING p_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 6. دوال ميزان المراجعة والتقارير المالية (Reporting & Analytics RPCs)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_trial_balance(p_start_date date, p_end_date date)
RETURNS TABLE (
    account_id uuid,
    account_code text,
    account_name text,
    opening_debit numeric,
    opening_credit numeric,
    period_debit numeric,
    period_credit numeric,
    ending_debit numeric,
    ending_credit numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH op_lines AS (
        SELECT 
            jl.account_id,
            COALESCE(SUM(jl.debit), 0) AS op_deb,
            COALESCE(SUM(jl.credit), 0) AS op_cred
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jh.id = jl.header_id
        WHERE jh.entry_date < p_start_date
          AND jh.status IN ('posted', 'معتمد', 'مرحل', 'approved')
        GROUP BY jl.account_id
    ),
    per_lines AS (
        SELECT 
            jl.account_id,
            COALESCE(SUM(jl.debit), 0) AS per_deb,
            COALESCE(SUM(jl.credit), 0) AS per_cred
        FROM public.journal_lines jl
        JOIN public.journal_headers jh ON jh.id = jl.header_id
        WHERE jh.entry_date >= p_start_date AND jh.entry_date <= p_end_date
          AND jh.status IN ('posted', 'معتمد', 'مرحل', 'approved')
        GROUP BY jl.account_id
    )
    SELECT 
        a.id AS account_id,
        a.code::text AS account_code,
        a.name::text AS account_name,
        COALESCE(op.op_deb, 0)::numeric AS opening_debit,
        COALESCE(op.op_cred, 0)::numeric AS opening_credit,
        COALESCE(per.per_deb, 0)::numeric AS period_debit,
        COALESCE(per.per_cred, 0)::numeric AS period_credit,
        (COALESCE(op.op_deb, 0) + COALESCE(per.per_deb, 0))::numeric AS ending_debit,
        (COALESCE(op.op_cred, 0) + COALESCE(per.per_cred, 0))::numeric AS ending_credit
    FROM public.accounts a
    LEFT JOIN op_lines op ON op.account_id = a.id
    LEFT JOIN per_lines per ON per.account_id = a.id
    WHERE a.is_transactional = true OR op.account_id IS NOT NULL OR per.account_id IS NOT NULL
    ORDER BY a.code ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_accounts_report_with_lines(p_date_from date, p_date_to date)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(acc_obj) INTO result
    FROM (
        SELECT 
            a.id,
            a.code,
            a.name,
            a.account_type,
            a.parent_id,
            a.is_transactional,
            COALESCE(jl_agg.total_debit, 0) AS total_debit,
            COALESCE(jl_agg.total_credit, 0) AS total_credit,
            CASE 
                WHEN a.account_type IN ('assets', 'expenses') THEN COALESCE(jl_agg.total_debit, 0) - COALESCE(jl_agg.total_credit, 0)
                ELSE COALESCE(jl_agg.total_credit, 0) - COALESCE(jl_agg.total_debit, 0)
            END AS balance,
            COALESCE(jl_agg.txs, '[]'::jsonb) AS transactions
        FROM public.accounts a
        LEFT JOIN LATERAL (
            SELECT 
                SUM(jl.debit) AS total_debit,
                SUM(jl.credit) AS total_credit,
                jsonb_agg(
                    jsonb_build_object(
                        'id', jl.id,
                        'entry_date', jh.entry_date,
                        'description', jh.description,
                        'debit', jl.debit,
                        'credit', jl.credit,
                        'notes', jl.notes,
                        'partner_name', p.name
                    ) ORDER BY jh.entry_date DESC, jl.id DESC
                ) AS txs
            FROM public.journal_lines jl
            JOIN public.journal_headers jh ON jh.id = jl.header_id
            LEFT JOIN public.partners p ON p.id = jl.partner_id
            WHERE jl.account_id = a.id
              AND jh.entry_date >= p_date_from 
              AND jh.entry_date <= p_date_to
        ) jl_agg ON true
        ORDER BY a.code ASC
    ) acc_obj;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_comprehensive_dashboard(start_date text, end_date text)
RETURNS jsonb AS $$
DECLARE
    d_start date := start_date::date;
    d_end date := end_date::date;
    res jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_sales', (SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices WHERE date >= d_start AND date <= d_end AND status != 'مسودة'),
        'total_expenses', (SELECT COALESCE(SUM(COALESCE(total_price, quantity * unit_price, 0)), 0) FROM public.expenses WHERE exp_date >= d_start AND exp_date <= d_end AND is_deleted IS NOT TRUE),
        'total_receipts', (SELECT COALESCE(SUM(amount), 0) FROM public.receipt_vouchers WHERE date >= d_start AND date <= d_end),
        'total_disbursements', (SELECT COALESCE(SUM(amount), 0) FROM public.payment_vouchers WHERE date >= d_start AND date <= d_end)
    ) INTO res;

    RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_dashboard_totals()
RETURNS TABLE (
    total_expenses numeric,
    total_paid numeric,
    total_pending numeric,
    total_posted_vouchers numeric,
    total_pending_vouchers numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COALESCE(SUM(COALESCE(total_price, quantity * unit_price, 0)), 0) FROM public.expenses WHERE is_deleted IS NOT TRUE) AS total_expenses,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM public.expenses WHERE is_deleted IS NOT TRUE) AS total_paid,
        (SELECT COALESCE(SUM(COALESCE(total_price, quantity * unit_price, 0) - COALESCE(paid_amount, 0)), 0) FROM public.expenses WHERE is_deleted IS NOT TRUE) AS total_pending,
        (SELECT COALESCE(SUM(amount), 0) FROM public.payment_vouchers WHERE is_posted = true) AS total_posted_vouchers,
        (SELECT COALESCE(SUM(amount), 0) FROM public.payment_vouchers WHERE is_posted IS NOT TRUE) AS total_pending_vouchers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_partner_balance(p_partner_id uuid)
RETURNS numeric AS $$
DECLARE
    v_bal numeric;
BEGIN
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) INTO v_bal
    FROM public.journal_lines jl
    WHERE jl.partner_id = p_partner_id;

    RETURN COALESCE(v_bal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 7. دوال العمليات والخدمات والتدقيق (Operations, Services & Audit RPCs)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_create_pos_receipt(p_invoice_id uuid)
RETURNS uuid AS $$
DECLARE
    v_inv RECORD;
    v_rec_id uuid;
    v_safe_acc uuid;
    v_rv_num text;
    v_is_card boolean;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
    IF v_inv.id IS NULL OR v_inv.payment_method = 'آجل' OR COALESCE(v_inv.total_amount, 0) <= 0 THEN
        RETURN NULL;
    END IF;

    SELECT id INTO v_rec_id FROM public.receipt_vouchers WHERE invoice_id = p_invoice_id LIMIT 1;
    IF v_rec_id IS NOT NULL THEN
        RETURN v_rec_id;
    END IF;

    v_rv_num := 'RV-POS-' || substring(md5(random()::text) from 1 for 6);
    v_is_card := (v_inv.payment_method LIKE '%شبك%' OR v_inv.payment_method LIKE '%مدى%' OR v_inv.payment_method LIKE '%بطاق%' OR v_inv.payment_method LIKE '%بنك%');

    IF v_is_card THEN
        SELECT id INTO v_safe_acc FROM public.accounts WHERE code = '1102' OR name LIKE '%بنك%' OR account_type = 'assets' LIMIT 1;
    ELSE
        SELECT id INTO v_safe_acc FROM public.accounts WHERE code = '1101' OR name LIKE '%صندوق%' OR name LIKE '%خزينة%' OR account_type = 'assets' LIMIT 1;
    END IF;

    INSERT INTO public.receipt_vouchers (
        receipt_number, date, amount, payment_method, notes, invoice_id,
        partner_id, delegate_id, status, shift_id, fleet_operation_id, safe_bank_acc_id
    ) VALUES (
        v_rv_num, COALESCE(v_inv.date, CURRENT_DATE), v_inv.total_amount, v_inv.payment_method,
        'سداد تلقائي لفاتورة نقاط البيع #' || COALESCE(v_inv.invoice_number, ''),
        v_inv.id, v_inv.partner_id, v_inv.delegate_id, 'معتمد',
        v_inv.shift_id, v_inv.fleet_operation_id, v_safe_acc
    ) RETURNING id INTO v_rec_id;

    PERFORM public.post_receipts_bulk(ARRAY[v_rec_id]);

    RETURN v_rec_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.clean_blind_journal_lines()
RETURNS void AS $$
BEGIN
    DELETE FROM public.journal_lines 
    WHERE (COALESCE(debit, 0) = 0 AND COALESCE(credit, 0) = 0)
       OR header_id NOT IN (SELECT id FROM public.journal_headers)
       OR account_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.smart_audit_delete(p_error_id text, p_table_name text)
RETURNS void AS $$
BEGIN
    IF p_table_name = 'journal_headers' THEN
        DELETE FROM public.journal_lines WHERE header_id = p_error_id::uuid;
        DELETE FROM public.journal_headers WHERE id = p_error_id::uuid;
    ELSIF p_table_name = 'journal_lines' THEN
        DELETE FROM public.journal_lines WHERE id = p_error_id::uuid;
    ELSE
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table_name) USING p_error_id::uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_service_operation_with_journal(
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
    p_created_by uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_op_id uuid;
    v_comm_amount numeric := 0;
    v_net numeric := 0;
    v_jh_id uuid;
    v_emp_acc uuid;
BEGIN
    IF p_commission_percentage > 0 THEN
        v_comm_amount := ROUND((p_total_amount * p_commission_percentage / 100.0), 2);
    END IF;
    v_net := p_total_amount - v_comm_amount;

    INSERT INTO public.service_operations (
        operation_date, operation_type, description, client_id, employee_id,
        total_amount, commission_percentage, commission_amount, net_profit,
        debit_account_id, revenue_account_id, commission_expense_account_id,
        created_by, status
    ) VALUES (
        p_operation_date, p_operation_type, p_description, p_client_id, p_employee_id,
        p_total_amount, p_commission_percentage, v_comm_amount, v_net,
        p_debit_account_id, p_revenue_account_id, p_commission_expense_account_id,
        p_created_by, 'posted'
    ) RETURNING id INTO v_op_id;

    INSERT INTO public.journal_headers (entry_date, description, reference_id, v_type, status)
    VALUES (p_operation_date, 'عملية خدمية: ' || COALESCE(p_description, p_operation_type), v_op_id, 'service_operation', 'posted')
    RETURNING id INTO v_jh_id;

    IF p_total_amount > 0 AND p_debit_account_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_jh_id, p_debit_account_id, p_client_id, p_total_amount, 0, 'استحقاق عملية خدمية ' || p_operation_type);
    END IF;

    IF p_total_amount > 0 AND p_revenue_account_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes)
        VALUES (v_jh_id, p_revenue_account_id, 0, p_total_amount, 'إيراد عملية خدمية ' || p_operation_type);
    END IF;

    IF v_comm_amount > 0 AND p_commission_expense_account_id IS NOT NULL THEN
        INSERT INTO public.journal_lines (header_id, account_id, debit, credit, notes)
        VALUES (v_jh_id, p_commission_expense_account_id, v_comm_amount, 0, 'مصروف عمولة فني: ' || COALESCE(p_description, ''));

        SELECT account_id INTO v_emp_acc FROM public.partners WHERE id = p_employee_id;
        IF v_emp_acc IS NULL THEN
            SELECT id INTO v_emp_acc FROM public.accounts WHERE code = '2104' OR name LIKE '%رواتب%' OR name LIKE '%عمولات%' LIMIT 1;
        END IF;

        IF v_emp_acc IS NOT NULL THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_jh_id, v_emp_acc, p_employee_id, 0, v_comm_amount, 'استحقاق عمولة خدمة');
        END IF;
    END IF;

    UPDATE public.service_operations SET journal_id = v_jh_id WHERE id = v_op_id;

    RETURN v_op_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.bulk_disburse_v2(p_ids uuid[], p_user_id uuid)
RETURNS TABLE (processed_count integer, total_amount numeric) AS $$
DECLARE
    v_exp RECORD;
    v_pv_num text;
    v_count integer := 0;
    v_sum numeric := 0;
    v_amt numeric;
    v_pv_id uuid;
    v_debit_acc uuid;
    v_credit_acc uuid;
BEGIN
    FOR v_exp IN SELECT * FROM public.expenses WHERE id = ANY(p_ids) AND is_deleted IS NOT TRUE
    LOOP
        v_amt := COALESCE(v_exp.total_price, v_exp.quantity * v_exp.unit_price, 0) + COALESCE(v_exp.vat_amount, 0) - COALESCE(v_exp.paid_amount, 0);
        IF v_amt <= 0 THEN
            CONTINUE;
        END IF;

        v_pv_num := 'PV-EXP-' || substring(md5(random()::text) from 1 for 6);

        SELECT id INTO v_debit_acc FROM public.accounts WHERE code = split_part(v_exp.creditor_account, ' - ', 1) LIMIT 1;
        SELECT id INTO v_credit_acc FROM public.accounts WHERE code = split_part(v_exp.payment_account, ' - ', 1) LIMIT 1;

        IF v_debit_acc IS NULL THEN
            SELECT id INTO v_debit_acc FROM public.accounts WHERE account_type IN ('expenses', 'liabilities') LIMIT 1;
        END IF;
        IF v_credit_acc IS NULL THEN
            SELECT id INTO v_credit_acc FROM public.accounts WHERE account_type = 'assets' LIMIT 1;
        END IF;

        INSERT INTO public.payment_vouchers (
            voucher_number, date, amount, partner_id, debit_account_id, credit_account_id,
            payment_method, description, status, is_posted, created_by, related_expense_id,
            fleet_operation_id, shift_id
        ) VALUES (
            v_pv_num, COALESCE(v_exp.exp_date, CURRENT_DATE), v_amt, v_exp.payee_id, v_debit_acc, v_credit_acc,
            COALESCE(v_exp.payment_method, 'نقدي'), 'صرف مصروف: ' || COALESCE(v_exp.description, ''),
            'معتمد', true, p_user_id, v_exp.id, v_exp.fleet_operation_id, v_exp.shift_id
        ) RETURNING id INTO v_pv_id;

        PERFORM public.post_payment_vouchers_bulk(ARRAY[v_pv_id]);

        UPDATE public.expenses 
        SET paid_amount = COALESCE(paid_amount, 0) + v_amt 
        WHERE id = v_exp.id;

        v_count := v_count + 1;
        v_sum := v_sum + v_amt;
    END LOOP;

    RETURN QUERY SELECT v_count, v_sum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_payroll_balances_with_cutoff(p_month integer, p_year integer, p_cutoff_date date)
RETURNS TABLE (partner_id uuid, previous_unpaid_balance numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS partner_id,
        COALESCE(SUM(jl.credit - jl.debit), 0) AS previous_unpaid_balance
    FROM public.partners p
    LEFT JOIN public.journal_lines jl ON jl.partner_id = p.id
    LEFT JOIN public.journal_headers jh ON jh.id = jl.header_id AND jh.entry_date <= p_cutoff_date
    WHERE p.partner_type IN ('موظف', 'عامل', 'عامل يومية')
    GROUP BY p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pull_payroll_module_data(p_month integer, p_year integer, p_cutoff_date date)
RETURNS TABLE (partner_id uuid, days_worked numeric, deductions numeric, advances numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS partner_id,
        (SELECT COALESCE(SUM(quantity), 0) FROM public.labor_daily_logs l WHERE l.laborer_id = p.id AND l.log_date <= p_cutoff_date AND EXTRACT(MONTH FROM l.log_date) = p_month AND EXTRACT(YEAR FROM l.log_date) = p_year) AS days_worked,
        (SELECT COALESCE(SUM(amount), 0) FROM public.violations v WHERE v.partner_id = p.id AND v.violation_date <= p_cutoff_date AND EXTRACT(MONTH FROM v.violation_date) = p_month AND EXTRACT(YEAR FROM v.violation_date) = p_year) AS deductions,
        (SELECT COALESCE(SUM(amount), 0) FROM public.payment_vouchers pv WHERE pv.partner_id = p.id AND pv.date <= p_cutoff_date AND EXTRACT(MONTH FROM pv.date) = p_month AND EXTRACT(YEAR FROM pv.date) = p_year) AS advances
    FROM public.partners p
    WHERE p.partner_type IN ('موظف', 'عامل', 'عامل يومية');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 8. حماية التريجرز واستقلالية الورديات للمدراء (Shift Independence Triggers)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_single_open_pos_shift()
RETURNS trigger AS $$
DECLARE
    v_user_role text;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = NEW.delegate_id;

    IF v_user_role IN ('super_admin', 'admin', 'manager') THEN
        IF EXISTS (
            SELECT 1 FROM public.pos_shifts 
            WHERE warehouse_id = NEW.warehouse_id 
              AND status = 'open' 
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'يوجد بالفعل وردية مفتوحة لهذا المستودع/الفرع. يرجى إغلاقها أولاً.';
        END IF;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.pos_shifts 
            WHERE delegate_id = NEW.delegate_id 
              AND status = 'open' 
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'لدى الموظف وردية مفتوحة بالفعل. لا يمكن فتح أكثر من وردية لنفس الموظف بالتوازي.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_single_open_pos_shift ON public.pos_shifts;
CREATE TRIGGER trg_check_single_open_pos_shift
    BEFORE INSERT OR UPDATE OF status ON public.pos_shifts
    FOR EACH ROW
    WHEN (NEW.status = 'open')
    EXECUTE FUNCTION public.check_single_open_pos_shift();
