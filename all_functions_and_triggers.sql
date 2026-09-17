-- 1. Ø¥Ø²Ø§Ù„Ø© Ø´Ø±Ø· Ø§Ù„Ù€ UNIQUE Ù…Ù† Ø¹Ù…ÙˆØ¯ expense_number Ù„Ù„Ø³Ù…Ø§Ø­ Ø¨ØªÙƒØ±Ø§Ø±Ù‡ Ù„Ù„Ø¨Ù†ÙˆØ¯ Ø§Ù„ØªÙŠ ØªÙ†ØªÙ…ÙŠ Ù„Ù†ÙØ³ Ø§Ù„Ø¥Ø°Ù†
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.expenses'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(expense_number)%';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.expenses DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. ØªØ­Ø¯ÙŠØ« Ø¯Ø§Ù„Ø© RPC Ù„Ø­ÙØ¸ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª Ø¨Ø³Ø·ÙˆØ± Ù…ØªØ¹Ø¯Ø¯Ø© ÙˆØªÙˆÙ„ÙŠØ¯ Ø±Ù‚Ù… Ø¥Ø°Ù† ØªÙ„Ù‚Ø§Ø¦ÙŠ
CREATE OR REPLACE FUNCTION public.save_expense_with_settlement(
    p_id uuid,
    p_exp_date date,
    p_main_category text,
    p_sub_contractor text,
    p_site_ref text,
    p_creditor_account text,
    p_description text,
    p_payee_name text,
    p_payment_method text,
    p_payment_account text,
    p_employee_name text,
    p_quantity numeric,
    p_unit_price numeric,
    p_vat_amount numeric,
    p_discount_amount numeric,
    p_discount_account text,
    p_notes text,
    p_invoice_image text,
    p_lines_data jsonb,
    p_is_auto_distributed boolean,
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
    -- ØªÙˆÙ„ÙŠØ¯ Ø±Ù‚Ù… Ø§Ù„Ø¥Ø°Ù† Ø¥Ø°Ø§ ÙƒØ§Ù† Ø¹Ù…Ù„ÙŠØ© Ø¥Ø¯Ø®Ø§Ù„ Ø¬Ø¯ÙŠØ¯Ø©
    IF p_id IS NULL THEN
        -- Ø§Ù„ØµÙŠØºØ©: EXP-YYYYMMDD-Random
        generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    ELSE
        -- ÙÙŠ Ø­Ø§Ù„Ø© Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ØŒ Ù†Ø­ØªÙØ¸ Ø¨Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù‚Ø¯ÙŠÙ… ÙˆÙ†Ø­Ø°Ù Ø§Ù„Ø£Ø³Ø·Ø± Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡ Ù„Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø¯Ø®Ø§Ù„Ù‡Ø§
        SELECT expense_number INTO generated_expense_number FROM public.expenses WHERE id = p_id LIMIT 1;
        
        IF generated_expense_number IS NOT NULL THEN
            DELETE FROM public.expenses WHERE expense_number = generated_expense_number;
        ELSE
            -- Ù„Ùˆ Ù„Ø³Ø¨Ø¨ Ù…Ø§ Ù…ÙÙŠØ´ Ø±Ù‚Ù…ØŒ Ù†Ø¹Ù…Ù„Ù‡ Ø±Ù‚Ù… Ø¬Ø¯ÙŠØ¯
            generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
        END IF;
    END IF;

    -- ØªØ¬Ù‡ÙŠØ² Ù…ØµÙÙˆÙØ© Ø§Ù„Ø¨Ù†ÙˆØ¯
    IF p_lines_data IS NULL OR jsonb_array_length(p_lines_data) = 0 THEN
        -- Ø¥Ø°Ø§ Ù„Ù… ÙŠÙƒÙ† Ù‡Ù†Ø§Ùƒ Ø¨Ù†ÙˆØ¯ Ø¥Ø¶Ø§ÙÙŠØ©ØŒ Ù†Ø¹ØªØ¨Ø± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© ÙƒØ¨Ù†Ø¯ ÙˆØ­ÙŠØ¯
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

    -- Ø§Ù„Ø¯ÙˆØ±Ø§Ù† Ø¹Ù„Ù‰ Ø§Ù„Ø¨Ù†ÙˆØ¯ ÙˆØ¥Ø¯Ø®Ø§Ù„Ù‡Ø§ ÙƒØ³Ø·ÙˆØ± Ù…Ù†ÙØµÙ„Ø© ÙÙŠ Ø§Ù„Ø¯Ø§ØªØ§Ø¨ÙŠØ²
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
            sub_contractor,
            site_ref,
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
            job_order_id,
            is_deducted_from_contractor,
            lines_data -- Ù†Ø­ØªÙØ¸ Ø¨Ù‡Ø§ ÙØ§Ø±ØºØ© Ù„Ø£Ù†Ù†Ø§ ÙØµÙ„Ù†Ø§ Ø§Ù„Ø¨Ù†ÙˆØ¯
        ) VALUES (
            generated_expense_number,
            p_exp_date,
            p_main_category,
            p_sub_contractor,
            p_site_ref,
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
            p_job_order_id,
            p_is_deducted_from_contractor,
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
-- ==============================================================================
-- ðŸš€ ØªØ­Ø¯ÙŠØ«Ø§Øª Ø§Ù„Ø¨Ø§Ùƒ Ø¥Ù†Ø¯ (RPCs) - Ù†Ø¸Ø§Ù… Ø±ÙˆØ§Ø³ÙŠ
-- ÙŠÙØ±Ø¬Ù‰ Ù†Ø³Ø® Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ ÙˆÙ„ØµÙ‚Ù‡ ÙÙŠ Supabase SQL Editor Ø«Ù… Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ø¯ÙˆØ§Ù„ Ø§Ù„Ù‚Ø¯ÙŠÙ…Ø© Ù„ØªØ¬Ù†Ø¨ ØªØ¹Ø§Ø±Ø¶ Ù†ÙˆØ¹ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª (Return Type Error)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS close_pos_shift(UUID, NUMERIC);
DROP FUNCTION IF EXISTS post_expense_to_journal(UUID);
DROP FUNCTION IF EXISTS approve_inventory_transaction(UUID);

-- ------------------------------------------------------------------------------
-- 1. Ø¯Ø§Ù„Ø© Ø¥ØºÙ„Ø§Ù‚ ÙˆØ±Ø¯ÙŠØ© Ø§Ù„ÙƒØ§Ø´ÙŠØ± (POS Shift Close)
-- ØªÙ‚ÙˆÙ… Ø¨Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© ÙˆØ§Ù„Ø¢Ø¬Ù„Ø© ÙˆØ§Ù„Ø´Ø¨ÙƒØ© ÙˆØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø¹Ø¬Ø²/Ø§Ù„Ø²ÙŠØ§Ø¯Ø© Ø¨Ø£Ù…Ø§Ù† ØªØ§Ù…
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_pos_shift(p_shift_id UUID, p_actual_cash NUMERIC)
RETURNS void AS $$
DECLARE
    v_starting_cash NUMERIC;
    v_total_sales NUMERIC := 0;
    v_cash_sales NUMERIC := 0;
    v_card_sales NUMERIC := 0;
    v_credit_sales NUMERIC := 0;
    v_expected_cash NUMERIC := 0;
BEGIN
    -- Ø¬Ù„Ø¨ Ø§Ù„Ø¹Ù‡Ø¯Ø© Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠØ©
    SELECT starting_cash INTO v_starting_cash
    FROM pos_shifts
    WHERE id = p_shift_id;

    IF v_starting_cash IS NULL THEN
        RAISE EXCEPTION 'Ø§Ù„ÙˆØ±Ø¯ÙŠØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ ØªÙ… Ø­Ø°ÙÙ‡Ø§';
    END IF;

    -- Ø­Ø³Ø§Ø¨ Ø¥Ø¬Ù…Ø§Ù„ÙŠØ§Øª Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ù† Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø±Ø¨ÙˆØ·Ø© Ø¨Ù‡Ø°Ù‡ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('ÙƒØ§Ø´', 'Ù†Ù‚Ø¯ÙŠ (ÙƒØ§Ø´)', 'Ù†Ù‚Ø¯ÙŠ') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('Ø´Ø¨ÙƒØ©', 'Ø´Ø¨ÙƒØ© (Ù…Ø¯Ù‰)', 'Ø¨Ø·Ø§Ù‚Ø©', 'Ù…Ø¯Ù‰') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('Ø¢Ø¬Ù„', 'credit') THEN total_amount ELSE 0 END), 0)
    INTO 
        v_total_sales,
        v_cash_sales,
        v_card_sales,
        v_credit_sales
    FROM invoices
    WHERE shift_id = p_shift_id AND status != 'Ù…Ù„ØºØ§Ø©';

    -- Ø­Ø³Ø§Ø¨ Ø§Ù„Ù†Ù‚Ø¯ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹ (Ø§Ù„Ø¹Ù‡Ø¯Ø© + Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„ÙƒØ§Ø´)
    v_expected_cash := v_starting_cash + v_cash_sales;

    -- ØªØ­Ø¯ÙŠØ« ÙˆØªØ´ÙÙŠØ± Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØ±Ø¯ÙŠØ© (ÙŠÙ…Ù†Ø¹ Ø§Ù„ÙƒØ§Ø´ÙŠØ± Ù…Ù† Ø§Ù„ØªÙ„Ø§Ø¹Ø¨)
    UPDATE pos_shifts
    SET 
        closed_at = NOW(),
        status = 'closed',
        actual_cash = p_actual_cash,
        expected_cash = v_expected_cash,
        total_sales = v_total_sales,
        total_cash_sales = v_cash_sales,
        total_card_sales = v_card_sales,
        total_credit_sales = v_credit_sales,
        shortage_overage = p_actual_cash - v_expected_cash
    WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 2. Ø¯Ø§Ù„Ø© ØªØ±Ø­ÙŠÙ„ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø²Ø¯ÙˆØ¬ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ (Expense Journal)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION post_expense_to_journal(p_expense_id UUID)
RETURNS void AS $$
DECLARE
    v_expense RECORD;
    v_journal_id UUID;
    v_debit_acc UUID;
    v_credit_acc UUID;
    v_total_amount NUMERIC;
BEGIN
    -- Ù‚Ø±Ø§Ø¡Ø© Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØµØ±ÙˆÙ
    SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

    IF v_expense.is_posted THEN
        RAISE EXCEPTION 'Ù‡Ø°Ø§ Ø§Ù„Ù…ØµØ±ÙˆÙ Ù…Ø±Ø­Ù‘Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹ ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† ØªØ±Ø­ÙŠÙ„Ù‡ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰';
    END IF;

    -- Ø­Ø³Ø§Ø¨ Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠØ©
    v_total_amount := COALESCE(v_expense.total_price, (v_expense.quantity * v_expense.unit_price)) + COALESCE(v_expense.vat_amount, 0);

    -- Ø§Ø³ØªØ®Ø±Ø§Ø¬ ID Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ØµØ±ÙˆÙ (Ø§Ù„Ù…Ø¯ÙŠÙ†) ÙˆØ­Ø³Ø§Ø¨ Ø§Ù„Ø¯ÙØ¹ (Ø§Ù„Ø¯Ø§Ø¦Ù†) Ù…Ù† Ø§Ù„Ø£ÙƒÙˆØ§Ø¯
    -- Ø§ÙØªØ±Ø§Ø¶ Ø£Ù† Ø§Ù„Ù‚ÙŠÙ…Ø© Ù…Ø®Ø²Ù†Ø© Ø¨ØµÙŠØºØ© "Code - Name"
    SELECT id INTO v_debit_acc FROM accounts WHERE code = split_part(v_expense.creditor_account, ' - ', 1) LIMIT 1;
    SELECT id INTO v_credit_acc FROM accounts WHERE code = split_part(v_expense.payment_account, ' - ', 1) LIMIT 1;

    -- Ø¥Ø°Ø§ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ×”×—Ø³Ø§Ø¨ Ø¹Ø¨Ø± Ø§Ù„ÙƒÙˆØ¯ØŒ Ù†Ø­Ø§ÙˆÙ„ Ø§Ù„Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠØ© ÙƒØ­Ù…Ø§ÙŠØ©
    IF v_debit_acc IS NULL THEN
        SELECT id INTO v_debit_acc FROM accounts WHERE account_type = 'expenses' LIMIT 1;
    END IF;
    IF v_credit_acc IS NULL THEN
        SELECT id INTO v_credit_acc FROM accounts WHERE account_type = 'assets' LIMIT 1;
    END IF;

    -- Ø¥Ù†Ø´Ø§Ø¡ Ø±Ø£Ø³ Ø§Ù„Ù‚ÙŠØ¯ (Journal Header)
    INSERT INTO journal_headers (entry_date, description, reference_id, status, fleet_operation_id)
    VALUES (v_expense.exp_date, 'Ù‚ÙŠØ¯ Ù…ØµØ±ÙˆÙ Ø¢Ù„ÙŠ: ' || v_expense.description, v_expense.id, 'posted', v_expense.fleet_operation_id)
    RETURNING id INTO v_journal_id;

    -- Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ù…Ø¯ÙŠÙ† (Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª)
    INSERT INTO journal_lines (header_id, account_id, debit, credit, notes, partner_id, fleet_operation_id)
    VALUES (v_journal_id, v_debit_acc, v_total_amount, 0, v_expense.description, v_expense.payee_id, v_expense.fleet_operation_id);

    -- Ø§Ù„Ø³Ø·Ø± Ø§Ù„Ø¯Ø§Ø¦Ù† (Ø­Ø³Ø§Ø¨ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ©/Ø§Ù„Ø¨Ù†Ùƒ)
    INSERT INTO journal_lines (header_id, account_id, debit, credit, notes, partner_id, fleet_operation_id)
    VALUES (v_journal_id, v_credit_acc, 0, v_total_amount, 'Ø³Ø¯Ø§Ø¯ Ù…ØµØ±ÙˆÙ: ' || v_expense.description, v_expense.payee_id, v_expense.fleet_operation_id);

    -- ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ù…ØµØ±ÙˆÙ ÙƒÙ€ "Ù…Ø±Ø­Ù‘Ù„"
    UPDATE expenses SET is_posted = true WHERE id = p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 3. Ø¯Ø§Ù„Ø© Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù„Ø­Ø±ÙƒØ§Øª Ø§Ù„Ù…Ø®Ø²ÙˆÙ† (Inventory Sync RPC)
-- ØªÙ‚ÙˆÙ… Ø¨Ø®ØµÙ… Ø£Ùˆ Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø¨Ù…Ø±ÙˆÙ†Ø© ÙˆØªØ¯Ø¹Ù… Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹Ø§Øª ÙˆØ§Ù„Ø³ÙŠØ§Ø±Ø§Øª
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_inventory_transaction(p_id UUID)
RETURNS void AS $$
DECLARE
    v_txn RECORD;
    v_exists_wh UUID;
BEGIN
    SELECT * INTO v_txn FROM inventory_transactions WHERE id = p_id;
    
    IF v_txn.status = 'approved' THEN
        RAISE EXCEPTION 'Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹ ÙˆØªÙ… Ø®ØµÙ…Ù‡Ø§ Ù…Ù† Ø§Ù„Ù…Ø®Ø²ÙˆÙ†';
    END IF;

    -- Ø­Ø±ÙƒØ© Ø¥Ø¶Ø§ÙØ© (IN)
    IF v_txn.type IN ('in', 'transfer_in') THEN
        -- ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙ†Ù Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ
        UPDATE inventory_items SET current_quantity = current_quantity + v_txn.quantity WHERE id = v_txn.item_id;
        
        -- ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ Ø§Ù„ÙØ±Ø¹ÙŠ Ø¥Ù† ÙˆÙØ¬Ø¯
        IF v_txn.warehouse_id IS NOT NULL THEN
            SELECT id INTO v_exists_wh FROM warehouse_inventory WHERE warehouse_id = v_txn.warehouse_id AND item_id = v_txn.item_id LIMIT 1;
            IF v_exists_wh IS NOT NULL THEN
                UPDATE warehouse_inventory SET quantity = quantity + v_txn.quantity, updated_at = NOW() WHERE id = v_exists_wh;
            ELSE
                INSERT INTO warehouse_inventory (warehouse_id, item_id, quantity) VALUES (v_txn.warehouse_id, v_txn.item_id, v_txn.quantity);
            END IF;
        END IF;

    -- Ø­Ø±ÙƒØ© ØµØ±Ù Ø£Ùˆ Ù…Ø¨ÙŠØ¹Ø§Øª (OUT)
    ELSIF v_txn.type IN ('out', 'sales_deduction', 'transfer_out') THEN
        -- ØªØ­Ø¯ÙŠØ« Ø§Ù„ØµÙ†Ù Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ
        UPDATE inventory_items SET current_quantity = current_quantity - v_txn.quantity WHERE id = v_txn.item_id;
        
        -- ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ Ø§Ù„ÙØ±Ø¹ÙŠ Ø¥Ù† ÙˆÙØ¬Ø¯
        IF v_txn.warehouse_id IS NOT NULL THEN
            SELECT id INTO v_exists_wh FROM warehouse_inventory WHERE warehouse_id = v_txn.warehouse_id AND item_id = v_txn.item_id LIMIT 1;
            IF v_exists_wh IS NOT NULL THEN
                UPDATE warehouse_inventory SET quantity = quantity - v_txn.quantity, updated_at = NOW() WHERE id = v_exists_wh;
            ELSE
                -- Ø¨Ø§Ù„Ø³Ø§Ù„Ø¨ Ù„Ø£Ù†Ù‡ Ø§Ù†ØµØ±Ù ÙˆÙ„Ù… ÙŠÙƒÙ† Ù…Ø³Ø¬Ù„Ø§Ù‹
                INSERT INTO warehouse_inventory (warehouse_id, item_id, quantity) VALUES (v_txn.warehouse_id, v_txn.item_id, -v_txn.quantity);
            END IF;
        END IF;
    END IF;

    -- Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©
    UPDATE inventory_transactions SET status = 'approved' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 1. Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£ØµÙ†Ø§Ù (Ø¯Ù„ÙŠÙ„ Ø§Ù„Ù…ÙˆØ§Ø¯)
create table if not exists public.material_items (
  id uuid not null default gen_random_uuid (),
  item_code character varying null,
  item_name character varying not null,
  main_category character varying null,
  default_unit character varying null default 'Ø­Ø¨Ø©',
  notes text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint material_items_pkey primary key (id)
);

-- 2. Ø¬Ø¯ÙˆÙ„ Ø­Ø±ÙƒØ© Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ø§Ù„ÙˆØ§Ø±Ø¯ ÙˆØ§Ù„Ù…Ù†ØµØ±Ù)
create table if not exists public.inventory_transactions (
  id uuid not null default gen_random_uuid (),
  transaction_number character varying null,
  transaction_date timestamp with time zone not null default timezone ('utc'::text, now()),
  type character varying not null, -- 'in' (ÙˆØ§Ø±Ø¯) or 'out' (Ù…Ù†ØµØ±Ù)
  quantity numeric not null default 0,
  item_id uuid not null references public.material_items (id),
  partner character varying null, -- Ø§Ù„Ù…ÙˆØ±Ø¯ Ø£Ùˆ Ø§Ù„Ø¹Ù…ÙŠÙ„
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint inventory_transactions_pkey primary key (id)
);

-- 3. Ø¯Ø§Ù„Ø© Ø­Ø³Ø§Ø¨ Ø£Ø±ØµØ¯Ø© Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (RPC)
CREATE OR REPLACE FUNCTION rpc_get_inventory_balances()
RETURNS TABLE (
  item_id uuid,
  item_name character varying,
  available_quantity numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.item_id,
    MAX(m.item_name) as item_name,
    SUM(CASE WHEN t.type = 'in' THEN t.quantity ELSE -t.quantity END) as available_quantity
  FROM inventory_transactions t
  LEFT JOIN material_items m ON t.item_id = m.id
  GROUP BY t.item_id;
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- ðŸš€ Ù†Ø¸Ø§Ù… ØªÙØ§ØµÙŠÙ„ ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª (POS Shift Details & Audit Engine)
-- Ù…ØªÙˆØ§ÙÙ‚ 100% Ù…Ø¹ Ø³ÙƒÙŠÙ…Ø§ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆÙ†Ø¸Ø§Ù… Ù†Ù‚Ø§Ø· Ø§Ù„Ø¨ÙŠØ¹
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ø¯Ø§Ù„Ø© Ø¬Ù„Ø¨ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ø´Ø§Ù…Ù„Ø© (Shift Details & Audit Dossier)
-- ØªØ±Ø¬Ø¹ ÙƒØ§Ø¦Ù† JSON Ù…ØªÙƒØ§Ù…Ù„ ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰:
--  - Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØ±Ø¯ÙŠØ© ÙˆØ§Ù„Ù…Ù†ÙØ° ÙˆØ§Ù„Ù…Ù†Ø¯ÙˆØ¨ ÙˆØ§Ù„ÙƒØ§Ø´ÙŠØ±
--  - Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ù„Ù„ØµÙ†Ø¯ÙˆÙ‚ (Ø§Ù„Ø¹Ù‡Ø¯Ø©ØŒ Ø§Ù„ÙƒØ§Ø´ØŒ Ø§Ù„Ø´Ø¨ÙƒØ©ØŒ Ø§Ù„Ø¢Ø¬Ù„ØŒ Ø§Ù„Ø¹Ø¬Ø²/Ø§Ù„Ø²ÙŠØ§Ø¯Ø©)
--  - Ø¬Ø±Ø¯ ÙÙˆØ§Ø±Øº Ø§Ù„Ø¹Ø¨ÙˆØ§Øª ÙˆØ§Ù„Ø¬Ø§Ù„ÙˆÙ†Ø§Øª
--  - Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„ØµØ§Ø¯Ø±Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„
--  - ØªÙ‚Ø±ÙŠØ± Ù…Ø¬Ù…Ø¹ Ø¨Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ù…Ø¨Ø§Ø¹Ø© ÙˆØ§Ù„ÙƒÙ…ÙŠØ§Øª ÙˆØ§Ù„Ù‚ÙŠÙ…
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
    -- 1. Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
    SELECT * INTO v_shift
    FROM pos_shifts
    WHERE id = p_shift_id;

    IF v_shift IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ / Ù…Ù†ÙØ° Ø§Ù„Ø¨ÙŠØ¹
    SELECT id, name, type, location, phone, vehicle_id INTO v_warehouse
    FROM warehouses
    WHERE id = v_shift.warehouse_id;

    -- 3. Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„
    SELECT id, name, phone, code, vat_number INTO v_delegate
    FROM partners
    WHERE id = v_shift.delegate_id;

    -- 4. Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙƒØ§Ø´ÙŠØ± / Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…
    SELECT id, full_name, username, email INTO v_profile
    FROM profiles
    WHERE id = v_shift.user_id;

    -- 5. Ø¬Ù„Ø¨ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙÙˆØ§ØªÙŠØ± Ø§Ù„ØªØ§Ø¨Ø¹Ø© Ù„Ù„ÙˆØ±Ø¯ÙŠØ©
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', inv.id,
            'invoice_number', inv.invoice_number,
            'date', inv.date,
            'created_at', inv.created_at,
            'client_name', COALESCE(inv.client_name, 'Ø¹Ù…ÙŠÙ„ Ù†Ù‚Ø¯ÙŠ'),
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

    -- 6. ØªØ¬Ù…ÙŠØ¹ Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ù…Ø¨Ø§Ø¹Ø© Ø®Ù„Ø§Ù„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ù† lines_data
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
            COALESCE(line->>'name', line->'inventory_items'->>'name', 'ØµÙ†Ù') AS item_name,
            SUM(COALESCE((line->>'quantity')::numeric, (line->>'qty')::numeric, 0)) AS total_qty,
            SUM(COALESCE((line->>'total')::numeric, (line->>'total_price')::numeric, 
                COALESCE((line->>'quantity')::numeric, (line->>'qty')::numeric, 0) * COALESCE((line->>'unit_price')::numeric, (line->>'price')::numeric, (line->>'selected_price')::numeric, 0))) AS total_amount
        FROM invoices inv,
             jsonb_array_elements(COALESCE(inv.lines_data, '[]'::jsonb)) AS line
        WHERE inv.shift_id = p_shift_id
        GROUP BY COALESCE(line->>'item_id', line->>'id'), COALESCE(line->>'name', line->'inventory_items'->>'name', 'ØµÙ†Ù')
    ) item_grp;

    -- 7. Ø¬Ù„Ø¨ Ø£ÙŠ Ø³Ù†Ø¯Ø§Øª Ù‚Ø¨Ø¶ Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù‡Ø°Ù‡ Ø§Ù„ÙÙˆØ§ØªÙŠØ±
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

    -- 8. ØªÙƒÙˆÙŠÙ† Ù…Ù„Ù Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…ØªÙƒØ§Ù…Ù„ Ù„Ù„ÙˆØ±Ø¯ÙŠØ©
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
            'name', COALESCE(v_warehouse.name, 'Ù…Ø³ØªÙˆØ¯Ø¹ ØºÙŠØ± Ù…Ø­Ø¯Ø¯'),
            'type', v_warehouse.type
        ),
        'delegate', jsonb_build_object(
            'id', v_delegate.id,
            'name', COALESCE(v_delegate.name, 'Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø¨Ø§Ø´Ø±Ø© (Ø¨Ø¯ÙˆÙ† Ù…Ù†Ø¯ÙˆØ¨)'),
            'phone', v_delegate.phone,
            'code', v_delegate.code
        ),
        'cashier', jsonb_build_object(
            'id', v_shift.user_id,
            'name', COALESCE(v_profile.full_name, v_profile.username, v_profile.email, 'ÙƒØ§Ø´ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…')
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
-- 2. Ø¯Ø§Ù„Ø© Ø§Ø³ØªØ¹Ø±Ø§Ø¶ ÙˆØªØµÙÙŠØ© Ø³Ø¬Ù„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª Ù„Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆØ§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©
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
        COALESCE(w.name, 'Ù…Ø³ØªÙˆØ¯Ø¹ ØºÙŠØ± Ù…Ø­Ø¯Ø¯')::VARCHAR AS warehouse_name,
        COALESCE(w.type, 'main')::VARCHAR AS warehouse_type,
        s.delegate_id,
        COALESCE(d.name, 'Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø¨Ø§Ø´Ø±Ø©')::VARCHAR AS delegate_name,
        COALESCE(p.full_name, p.username, p.email, 'ÙƒØ§Ø´ÙŠØ±')::TEXT AS cashier_name,
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
-- 3. ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ø¯ÙˆØ§Ù„ Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠ Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…ÙˆØ«Ù‚ÙŠÙ†
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_pos_shift_details(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_pos_shifts_list(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated, service_role, anon;
-- ==============================================================================
-- ðŸ›¡ï¸ Ø­Ù…Ø§ÙŠØ© Ø§Ù„ÙˆØ±Ø¯ÙŠØ§Øª ÙˆÙ†Ù‚Ø§Ø· Ø§Ù„Ø¨ÙŠØ¹ (POS Shift Protection & Concurrency Lock)
-- ÙŠÙ…Ù†Ø¹ ÙˆØ¬ÙˆØ¯ Ø£ÙƒØ«Ø± Ù…Ù† ÙˆØ±Ø¯ÙŠØ© Ù…ÙØªÙˆØ­Ø© ÙÙŠ Ù†ÙØ³ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙˆÙ‚Øª
-- ÙˆÙŠÙ…Ù†Ø¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ù…Ù† ÙØªØ­ Ø£ÙƒØ«Ø± Ù…Ù† ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø© ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙˆÙ‚Øª
-- ÙŠÙØ±Ø¬Ù‰ Ù†Ø³Ø® Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯ ÙˆÙ„ØµÙ‚Ù‡ ÙÙŠ Supabase SQL Editor Ø«Ù… Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Run
-- ==============================================================================

-- 1. ÙÙ‡Ø±Ø³ ÙØ±ÙŠØ¯ Ù…Ø´Ø±ÙˆØ· Ù„Ù…Ù†Ø¹ ÙØªØ­ ÙˆØ±Ø¯ÙŠØªÙŠÙ† Ù„Ù†ÙØ³ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙˆÙ‚Øª
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_single_open_warehouse
ON public.pos_shifts (warehouse_id)
WHERE (status = 'open');

-- 2. ÙÙ‡Ø±Ø³ ÙØ±ÙŠØ¯ Ù…Ø´Ø±ÙˆØ· Ù„Ù…Ù†Ø¹ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ù…Ù† ÙØªØ­ Ø£ÙƒØ«Ø± Ù…Ù† ÙˆØ±Ø¯ÙŠØ© ÙÙŠ Ù†ÙØ³ Ø§Ù„ÙˆÙ‚Øª
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_single_open_delegate
ON public.pos_shifts (delegate_id)
WHERE (status = 'open' AND delegate_id IS NOT NULL);

-- 3. Ø¯Ø§Ù„Ø© ÙˆØªØ±ÙŠØ¬Ø± Ø°ÙƒÙŠ Ù„ØªÙ‚Ø¯ÙŠÙ… Ø±Ø³Ø§Ø¦Ù„ Ø®Ø·Ø£ Ø¹Ø±Ø¨ÙŠØ© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙØµÙ„Ø©
CREATE OR REPLACE FUNCTION check_single_open_pos_shift()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_shift_id UUID;
    v_existing_delegate_name TEXT;
    v_existing_opened_at TIMESTAMPTZ;
    v_warehouse_name TEXT;
BEGIN
    -- Ø§Ù„ÙØ­Øµ ÙŠØ¹Ù…Ù„ ÙÙ‚Ø· Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ù…Ø±Ø§Ø¯ Ø­ÙØ¸Ù‡Ø§ Ø­Ø§Ù„ØªÙ‡Ø§ Ù…ÙØªÙˆØ­Ø© (open)
    IF NEW.status = 'open' THEN
        -- Ø¬Ù„Ø¨ Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ Ù„Ù„ØªÙˆØ¶ÙŠØ­ ÙÙŠ Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø®Ø·Ø£
        SELECT name INTO v_warehouse_name FROM public.warehouses WHERE id = NEW.warehouse_id;

        -- 1. ÙØ­Øµ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹: Ù‡Ù„ ØªÙˆØ¬Ø¯ Ø£ÙŠ ÙˆØ±Ø¯ÙŠØ© Ù…ÙØªÙˆØ­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ØŸ
        SELECT s.id, COALESCE(p.name, 'Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø¨Ø§Ø´Ø±Ø©'), s.opened_at
        INTO v_existing_shift_id, v_existing_delegate_name, v_existing_opened_at
        FROM public.pos_shifts s
        LEFT JOIN public.partners p ON p.id = s.delegate_id
        WHERE s.warehouse_id = NEW.warehouse_id
          AND s.status = 'open'
          AND (TG_OP = 'INSERT' OR s.id != NEW.id)
        LIMIT 1;

        IF v_existing_shift_id IS NOT NULL THEN
            RAISE EXCEPTION 'âš ï¸ Ø¹Ø°Ø±Ø§Ù‹ØŒ Ù„Ø§ ÙŠÙ…ÙƒÙ† ÙØªØ­ ÙˆØ±Ø¯ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø© ÙÙŠ Ù…Ø³ØªÙˆØ¯Ø¹ (%)! ØªÙˆØ¬Ø¯ Ø¨Ø§Ù„ÙØ¹Ù„ ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø© Ù…ÙØªÙˆØ­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ø¨Ø±Ù‚Ù… (#%) ÙˆØ§Ù„Ù…Ø³Ø¤ÙˆÙ„ Ø¹Ù†Ù‡Ø§: (%). ÙŠØ¬Ø¨ Ø¥Ù†Ù‡Ø§Ø¡ ÙˆØªÙ‚ÙÙŠÙ„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹ Ù‚Ø¨Ù„ Ø¨Ø¯Ø¡ ÙˆØ±Ø¯ÙŠØ© Ø¬Ø¯ÙŠØ¯Ø©.',
                COALESCE(v_warehouse_name, 'Ø§Ù„Ù…Ø­Ø¯Ø¯'),
                SUBSTRING(v_existing_shift_id::TEXT, 1, 8),
                v_existing_delegate_name;
        END IF;

        -- 2. ÙØ­Øµ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨: Ù‡Ù„ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø§Ù„Ù…Ø®ØªØ§Ø± Ù„Ø¯ÙŠÙ‡ Ø¨Ø§Ù„ÙØ¹Ù„ ÙˆØ±Ø¯ÙŠØ© Ù…ÙØªÙˆØ­Ø© ÙÙŠ Ù…Ø³ØªÙˆØ¯Ø¹ Ø¢Ø®Ø±ØŸ
        IF NEW.delegate_id IS NOT NULL THEN
            SELECT s.id, w.name, s.opened_at
            INTO v_existing_shift_id, v_warehouse_name, v_existing_opened_at
            FROM public.pos_shifts s
            LEFT JOIN public.warehouses w ON w.id = s.warehouse_id
            WHERE s.delegate_id = NEW.delegate_id
              AND s.status = 'open'
              AND (TG_OP = 'INSERT' OR s.id != NEW.id)
            LIMIT 1;

            IF v_existing_shift_id IS NOT NULL THEN
                RAISE EXCEPTION 'âš ï¸ Ù„Ø§ ÙŠÙ…ÙƒÙ† ÙØªØ­ Ø§Ù„ÙˆØ±Ø¯ÙŠØ©! Ù‡Ø°Ø§ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ù„Ø¯ÙŠÙ‡ Ø¨Ø§Ù„ÙØ¹Ù„ ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø© Ù…ÙØªÙˆØ­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ ÙÙŠ Ù…Ù†ÙØ° (%) Ø¨Ø±Ù‚Ù… (#%). ÙŠØ¬Ø¨ ØªÙ‚ÙÙŠÙ„ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø© Ø£ÙˆÙ„Ø§Ù‹.',
                    COALESCE(v_warehouse_name, 'Ø¢Ø®Ø±'),
                    SUBSTRING(v_existing_shift_id::TEXT, 1, 8);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_open_pos_shift ON public.pos_shifts;
CREATE TRIGGER trg_check_single_open_pos_shift
BEFORE INSERT OR UPDATE OF status, warehouse_id, delegate_id ON public.pos_shifts
FOR EACH ROW
EXECUTE FUNCTION check_single_open_pos_shift();

-- ------------------------------------------------------------------------------
-- 4. ØªØ±ÙŠØ¬Ø± Ø£Ù…Ø§Ù†: Ù…Ù†Ø¹ Ø¥ØµØ¯Ø§Ø± Ø£ÙŠ ÙØ§ØªÙˆØ±Ø© Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹ Ø¨Ø¯ÙˆÙ† Ø±Ø¨Ø·Ù‡Ø§ Ø¨ÙˆØ±Ø¯ÙŠØ© Ù†Ø´Ø·Ø© ÙˆÙ…ÙØªÙˆØ­Ø©
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_pos_invoice_shift_required()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_status TEXT;
BEGIN
    -- Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØµØ§Ø¯Ø±Ø© Ù…Ù† Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹
    IF (NEW.invoice_number LIKE 'INV-POS-%' OR NEW.shift_id IS NOT NULL) THEN
        IF NEW.shift_id IS NULL THEN
            RAISE EXCEPTION 'â›” Ù…Ù†Ø¹ Ø£Ù…Ù†ÙŠ: Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¥ØµØ¯Ø§Ø± Ø£ÙŠ ÙØ§ØªÙˆØ±Ø© Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹ Ø¨Ø¯ÙˆÙ† Ø¨Ø¯Ø¡ ÙˆÙØªØ­ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø£ÙˆÙ„Ø§Ù‹! ÙŠØ¬Ø¨ ÙØªØ­ Ø§Ù„ÙˆØ±Ø¯ÙŠØ© ÙˆØ±Ø¨Ø· Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù‡Ø§.';
        END IF;

        -- Ø§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø£Ù† Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ù…Ø±Ø¨ÙˆØ·Ø© Ù…ÙØªÙˆØ­Ø© ÙˆÙ„ÙŠØ³Øª Ù…ØºÙ„Ù‚Ø©
        SELECT status INTO v_shift_status FROM public.pos_shifts WHERE id = NEW.shift_id;
        IF v_shift_status != 'open' THEN
            RAISE EXCEPTION 'â›” Ø§Ù„ÙˆØ±Ø¯ÙŠØ© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø© Ù…ØºÙ„Ù‚Ø© Ø­Ø§Ù„ÙŠØ§Ù‹! Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø¹Ù„Ù‰ ÙˆØ±Ø¯ÙŠØ© ØªÙ… Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§ ÙˆØªÙ‚ÙÙŠÙ„ ØµÙ†Ø¯ÙˆÙ‚Ù‡Ø§.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_pos_invoice_shift_required ON public.invoices;
CREATE TRIGGER trg_check_pos_invoice_shift_required
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION check_pos_invoice_shift_required();

CREATE OR REPLACE FUNCTION public.approve_inventory_transaction(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_txn record;
    v_journal_id uuid;
    v_total_amount numeric;
    v_full_desc text;
    v_qty numeric;
    
    -- Ø­Ø³Ø§Ø¨Ø§Øª Ø«Ø§Ø¨ØªØ©
    v_inv_acc_id uuid := 'c5efa035-c8d5-4d13-bf33-7c7cd854f393'::uuid; -- Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø®Ø§Ù…Ø§Øª Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹
    v_delegate_custody_acc_id uuid := 'f9c7ba68-6998-48e6-99b3-3a4526d820a1'::uuid; -- Ø¹Ù‡Ø¯Ø© Ù…ÙˆØ¸ÙÙŠÙ† Ø§Ùˆ Ù…Ù†Ø§Ø¯ÙŠØ¨ (Ø°Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨)
    v_grni_acc_id uuid := 'c4b01e7f-b892-4517-bdc9-7cc97d8112f6'::uuid; -- ÙÙˆØ§ØªÙŠØ± Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… (GRNI)
    
    v_partner_acc_id uuid;
BEGIN
    -- Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø±ÙƒØ© Ø§Ù„Ø´Ø§Ù…Ù„Ø©
    SELECT t.*, 
           i.name as item_name,
           p.name as partner_name,
           p.partner_type as partner_type,
           p.account_id as partner_acc,
           fo.operation_number,
           fo.vehicle_id,
           fo.driver_id,
           v.plate_number as vehicle_plate,
           dp.name as driver_name
    INTO v_txn
    FROM public.inventory_transactions t
    LEFT JOIN public.inventory_items i ON i.id = t.item_id
    LEFT JOIN public.partners p ON p.id = t.partner_id
    LEFT JOIN public.fleet_operations fo ON fo.id = t.fleet_operation_id
    LEFT JOIN public.fleet_vehicles v ON v.id = fo.vehicle_id
    LEFT JOIN public.partners dp ON dp.id = fo.driver_id
    WHERE t.id = p_id AND (t.status IS NULL OR t.status = 'pending' OR t.status = 'Ù…Ø³ÙˆØ¯Ø©');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© Ø£Ùˆ Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_total_amount := v_qty * COALESCE(v_txn.unit_price, 0);
    
    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø© ÙˆØ§Ù„ÙƒÙ…ÙŠØ©ØŒ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù‚ÙŠÙ…Ø© ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† Ø£ÙƒØ¨Ø± Ù…Ù† ØµÙØ±';
    END IF;

    -- Ø¨Ù†Ø§Ø¡ Ø§Ù„ÙˆØµÙ Ø§Ù„Ø´Ø§Ù…Ù„
    v_full_desc := 'ØµÙ†Ù: ' || COALESCE(v_txn.item_name, 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯') || 
                   ' | ÙƒÙ…ÙŠØ©: ' || v_qty || 
                   ' | Ø¬Ù‡Ø©: ' || COALESCE(v_txn.partner_name, 'Ø¨Ø¯ÙˆÙ†') || 
                   ' | Ù…Ù†Ø¯ÙˆØ¨: ' || COALESCE(v_txn.driver_name, 'Ø¨Ø¯ÙˆÙ†') || 
                   ' | Ø³ÙŠØ§Ø±Ø©: ' || COALESCE(v_txn.vehicle_plate, 'Ø¨Ø¯ÙˆÙ†') || 
                   ' | Ø±Ø­Ù„Ø©: #' || COALESCE(v_txn.operation_number, 'Ø¨Ø¯ÙˆÙ†');

    -- ØªØ­Ø¯ÙŠØ¯ Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ±Ø¯/Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨
    IF COALESCE(v_txn.partner_type, '') IN ('delegate', 'employee') THEN
        v_partner_acc_id := v_delegate_custody_acc_id; -- Ø¹Ù‡Ø¯Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨
    ELSIF v_txn.type = 'in' THEN
        -- Ù‡Ù†Ø§ Ø§Ù„ØªØºÙŠÙŠØ± Ø§Ù„Ù…Ù‡Ù…: Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„ÙˆØ³ÙŠØ· (ÙÙˆØ§ØªÙŠØ± Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…) Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ±Ø¯ Ù…Ø¨Ø§Ø´Ø±Ø©
        v_partner_acc_id := v_grni_acc_id;
    ELSE
        -- Ù„Ù„Ù…Ù†ØµØ±ÙØŒ Ù†Ø¹ØªÙ…Ø¯ Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø£Ùˆ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ
        v_partner_acc_id := COALESCE(v_txn.partner_acc, '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid);
    END IF;

    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        -- ==========================================
        -- Ù…Ø³Ø§Ø± Ø¹Ù‡Ø¯Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ (Ø§Ù„Ø£Ø³Ø·ÙˆÙ„ / Ù†Ù‚Ù„ Ù…Ø¨Ø§Ø´Ø± Ù„Ø³ÙŠØ§Ø±Ø©)
        -- ==========================================
        -- 1. Ø®ØµÙ… Ù…Ù† Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, NULL);
        -- 2. Ø¥Ø¶Ø§ÙØ© Ø¥Ù„Ù‰ Ø³ÙŠØ§Ø±Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ (ÙƒÙ…Ø³ØªÙˆØ¯Ø¹ Ù…ØªÙ†Ù‚Ù„)
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_txn.vehicle_id);

        -- 3. Ø¥Ù†Ø´Ø§Ø¡ Ø±Ø£Ø³ Ø§Ù„Ù‚ÙŠØ¯
        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'ØªØ­Ù…ÙŠÙ„ Ø¹Ù‡Ø¯Ø© Ù…Ù†Ø¯ÙˆØ¨ - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        -- 4. Ø³Ø·ÙˆØ± Ø§Ù„Ù‚ÙŠØ¯ (Ø§Ù„Ù…Ø¯ÙŠÙ† Ù‡Ùˆ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ Ø´Ø®ØµÙŠØ§Ù‹ ÙÙŠ Ø­Ø³Ø§Ø¨ Ø¹Ù‡Ø¯ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†)
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_delegate_custody_acc_id, v_txn.driver_id, v_total_amount, 0, 'ØªØ­Ù…ÙŠÙ„ Ø¹Ù‡Ø¯Ø© (Ù…Ø¯ÙŠÙ† / Ø°Ù…Ø© Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨) - ' || v_full_desc);
        
        -- 5. (Ø§Ù„Ø¯Ø§Ø¦Ù† Ù‡Ùˆ Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹) Ù†Ø¬Ø¹Ù„ partner_id = NULL Ø­ØªÙ‰ Ù„Ø§ ÙŠØ¸Ù‡Ø± ÙÙŠ ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ù†Ø¯ÙˆØ¨ ÙˆÙŠÙØ±Ù‡
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ø¯Ø§Ø¦Ù†) - ' || v_full_desc);

    ELSE
        -- ==========================================
        -- Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø¹Ø§Ø¯ÙŠ (Ù…ÙˆØ±Ø¯ / Ø¹Ù…ÙŠÙ„ / Ø£Ùˆ ØµØ±Ù ÙŠØ¯ÙˆÙŠ Ù„Ù…Ù†Ø¯ÙˆØ¨)
        -- ==========================================
        IF v_txn.type IN ('in', 'transfer_in') THEN
            -- ØªÙˆØ±ÙŠØ¯ Ù„Ù„Ù…Ø®Ø²ÙˆÙ†
            PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, NULL);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'ØªÙˆØ±ÙŠØ¯ Ù…Ø®Ø²Ù†ÙŠ (Ø´Ø±Ø§Ø¡) - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, v_total_amount, 0, 'Ø§Ø³ØªÙ„Ø§Ù… Ù„Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ù…Ø¯ÙŠÙ†) - ' || v_full_desc);
            
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, 0, v_total_amount, 'Ø­Ø³Ø§Ø¨ ÙˆØ³ÙŠØ· Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… (Ø¯Ø§Ø¦Ù†) - ' || v_full_desc);
        ELSE
            -- ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
            PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, NULL);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'ØµØ±Ù Ù…Ø®Ø²Ù†ÙŠ - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, v_total_amount, 0, 'Ø§Ø³ØªØ­Ù‚Ø§Ù‚ Ù…Ø¯ÙŠÙ† (Ø°Ù…Ø©) - ' || v_full_desc);
            
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ø¯Ø§Ø¦Ù†) - ' || v_full_desc);
        END IF;
    END IF;

    -- ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø±ÙƒØ©
    UPDATE public.inventory_transactions SET status = 'approved', journal_id = v_journal_id WHERE id = p_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.approve_inventory_transaction(p_id uuid)
RETURNS void AS $$
DECLARE
    v_txn RECORD;
    v_qty numeric;
    v_unit_price numeric;
    v_total_amount numeric;
    v_tax_amount numeric;
    v_journal_id uuid;
    v_inv_acc_id uuid := 'c5efa035-c8d5-4d13-bf33-7c7cd854f393';
    v_vat_acc_id uuid := '990c949c-5f32-40d7-8d36-5fe45a6c892c';
    v_delegate_custody_acc_id uuid := 'd133777e-c5f6-42be-b333-ccce6496b97f';
    v_target_warehouse_id uuid;
    v_partner_acc_id uuid;
    v_full_desc text;
BEGIN
    SELECT i.*, 
           itm.name AS item_name, 
           p.name AS partner_name, p.account_id AS partner_acc, p.partner_type,
           fo.operation_number,
           veh.plate_number AS vehicle_plate,
           fo.vehicle_id, fo.driver_id, driver.name AS driver_name
    INTO v_txn
    FROM public.inventory_transactions i
    LEFT JOIN public.inventory_items itm ON itm.id = i.item_id
    LEFT JOIN public.partners p ON p.id = i.partner_id
    LEFT JOIN public.fleet_operations fo ON fo.id = i.fleet_operation_id
    LEFT JOIN public.fleet_vehicles veh ON veh.id = fo.vehicle_id
    LEFT JOIN public.partners driver ON driver.id = fo.driver_id
    WHERE i.id = p_id;

    IF v_txn.id IS NULL THEN
        RAISE EXCEPTION 'Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©';
    END IF;

    IF v_txn.status = 'approved' THEN
        RAISE EXCEPTION 'Ø§Ù„Ø­Ø±ÙƒØ© Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_unit_price := COALESCE(v_txn.unit_price, 0);
    v_total_amount := v_qty * v_unit_price;
    v_tax_amount := COALESCE(v_txn.tax_amount, 0);

    v_full_desc := 'ØµÙ†Ù: ' || COALESCE(v_txn.item_name, 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯') || 
                   ' | ÙƒÙ…ÙŠØ©: ' || v_qty || 
                   ' | Ø¬Ù‡Ø©: ' || COALESCE(v_txn.partner_name, 'Ø¨Ø¯ÙˆÙ†') || 
                   ' | Ø±Ø­Ù„Ø©: #' || COALESCE(v_txn.operation_number, 'Ø¨Ø¯ÙˆÙ†');

    IF COALESCE(v_txn.partner_type, '') IN ('delegate', 'employee') THEN
        v_partner_acc_id := v_delegate_custody_acc_id;
    ELSE
        v_partner_acc_id := COALESCE(v_txn.partner_acc, CASE WHEN v_txn.type IN ('in', 'transfer_in') THEN 'c4b01e7f-b892-4517-bdc9-7cc97d8112f6'::uuid ELSE '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid END);
    END IF;

    -- Use the transaction's warehouse_id or default to main warehouse
    v_target_warehouse_id := COALESCE(v_txn.warehouse_id, '11111111-1111-1111-1111-111111111111'::uuid);

    -- 1. Ø­Ø±ÙƒØ© Ø£Ø³Ø·ÙˆÙ„ / Ø¹Ù‡Ø¯Ø© Ø³ÙŠØ§Ø±Ø©
    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_txn.vehicle_id);

        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'ØªØ­Ù…ÙŠÙ„ Ø¹Ù‡Ø¯Ø© Ù…Ù†Ø¯ÙˆØ¨ - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_delegate_custody_acc_id, v_txn.driver_id, v_total_amount, 0, 'ØªØ­Ù…ÙŠÙ„ Ø¹Ù‡Ø¯Ø© (Ù…Ø¯ÙŠÙ†)');
        
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ø¯Ø§Ø¦Ù†)');

    -- 2. Ø¥ØªÙ„Ø§Ù Ù…Ø®Ø²Ù†ÙŠ ÙˆØªÙˆØ§Ù„Ù (Waste Accounting)
    ELSIF v_txn.type = 'waste' THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);

        IF v_total_amount > 0 THEN
            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'Ø¥ØªÙ„Ø§Ù Ù…Ø®Ø²Ù†ÙŠ - Ø®Ø³Ø§Ø¦Ø± ØªÙˆØ§Ù„Ù ÙˆÙ‡Ø¯Ø± - ' || COALESCE(v_txn.transaction_number, '') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, 'a5280000-0000-4000-a000-000000000528'::uuid, v_txn.partner_id, v_total_amount, 0, 'Ø®Ø³Ø§Ø¦Ø± ØªÙˆØ§Ù„Ù ÙˆÙ‡Ø¯Ø± Ù…Ø®Ø²Ù†ÙŠ (Ù…Ø¯ÙŠÙ†)');

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'ØªØ®ÙÙŠØ¶ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø¨Ø§Ù„ØªØ§Ù„Ù (Ø¯Ø§Ø¦Ù†)');
        END IF;

    -- 3. Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ÙÙˆØ§Ø±Øº (Empty Bottles Return)
    ELSIF v_txn.type = 'empty_return' THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);

        IF v_total_amount > 0 THEN
            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'Ø§Ø³ØªØ±Ø¬Ø§Ø¹ ÙÙˆØ§Ø±Øº Ù„Ù„Ù…Ø³ØªÙˆØ¯Ø¹ - ' || COALESCE(v_txn.transaction_number, '') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, v_total_amount, 0, 'Ø§Ø³ØªÙ„Ø§Ù… ÙÙˆØ§Ø±Øº Ù„Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ù…Ø¯ÙŠÙ†)');

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, 0, v_total_amount, 'ØªØ³ÙˆÙŠØ© Ø¹Ù‡Ø¯Ø©/ØªØ£Ù…ÙŠÙ†Ø§Øª ÙÙˆØ§Ø±Øº (Ø¯Ø§Ø¦Ù†)');
        END IF;

    -- 4. ØªÙˆØ±ÙŠØ¯ Ù…Ø®Ø²Ù†ÙŠ (Inflow)
    ELSIF v_txn.type IN ('in', 'transfer_in') THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);

        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'ØªÙˆØ±ÙŠØ¯ Ù…Ø®Ø²Ù†ÙŠ - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, v_total_amount, 0, 'Ø§Ø³ØªÙ„Ø§Ù… Ù„Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ù…Ø¯ÙŠÙ†)');
        
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, 0, v_total_amount, 'ÙÙˆØ§ØªÙŠØ± Ù‚ÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… (Ø¯Ø§Ø¦Ù†)');
        
    -- 5. ØµØ±Ù Ù…Ø®Ø²Ù†ÙŠ Ø¹Ø§Ø¯ÙŠ (Outflow)
    ELSE
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);

        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'ØµØ±Ù Ù…Ø®Ø²Ù†ÙŠ - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, v_total_amount + v_tax_amount, 0, 'Ø§Ø³ØªØ­Ù‚Ø§Ù‚ Ù…Ø¯ÙŠÙ† (Ø°Ù…Ø©)');
        
        IF v_tax_amount > 0 THEN
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_vat_acc_id, NULL, 0, v_tax_amount, 'Ø¶Ø±ÙŠØ¨Ø© Ù…Ø®Ø±Ø¬Ø§Øª (Ø¯Ø§Ø¦Ù†)');
        END IF;

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹ (Ø¯Ø§Ø¦Ù†)');
    END IF;

    UPDATE public.inventory_transactions SET status = 'approved' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.unapprove_inventory_transaction(p_id uuid)
RETURNS void AS $$
DECLARE
    v_txn RECORD;
    v_qty numeric;
    v_target_warehouse_id uuid;
BEGIN
    SELECT * INTO v_txn FROM public.inventory_transactions WHERE id = p_id;
    
    IF v_txn.id IS NULL THEN
        RAISE EXCEPTION 'Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©';
    END IF;

    IF v_txn.status != 'approved' THEN
        RAISE EXCEPTION 'Ø§Ù„Ø­Ø±ÙƒØ© ØºÙŠØ± Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_target_warehouse_id := COALESCE(v_txn.warehouse_id, '11111111-1111-1111-1111-111111111111'::uuid);

    -- Reverse inventory quantities
    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_txn.vehicle_id);
    ELSE
        IF v_txn.type IN ('in', 'transfer_in', 'empty_return') THEN
            PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);
        ELSE
            PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);
        END IF;
    END IF;

    -- Delete associated journal entries
    DELETE FROM public.journal_headers WHERE reference_id = p_id AND v_type = 'inventory';

    -- Reset status
    UPDATE public.inventory_transactions SET status = 'pending' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
