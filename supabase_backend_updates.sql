-- ==============================================================================
-- 🚀 تحديثات الباك إند (RPCs) - نظام رواسي
-- يُرجى نسخ هذا الكود بالكامل ولصقه في Supabase SQL Editor ثم الضغط على Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- تنظيف الدوال القديمة لتجنب تعارض نوع البيانات (Return Type Error)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS close_pos_shift(UUID, NUMERIC);
DROP FUNCTION IF EXISTS post_expense_to_journal(UUID);
DROP FUNCTION IF EXISTS approve_inventory_transaction(UUID);

-- ------------------------------------------------------------------------------
-- 1. دالة إغلاق وردية الكاشير (POS Shift Close)
-- تقوم بحساب المبيعات النقدية والآجلة والشبكة وتحديد العجز/الزيادة بأمان تام
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
    -- جلب العهدة الافتتاحية
    SELECT starting_cash INTO v_starting_cash
    FROM pos_shifts
    WHERE id = p_shift_id;

    IF v_starting_cash IS NULL THEN
        RAISE EXCEPTION 'الوردية غير موجودة أو تم حذفها';
    END IF;

    -- حساب إجماليات المبيعات من الفواتير المربوطة بهذه الوردية
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('كاش', 'نقدي (كاش)', 'نقدي') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('شبكة', 'شبكة (مدى)', 'بطاقة', 'مدى') THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_method IN ('آجل', 'credit') THEN total_amount ELSE 0 END), 0)
    INTO 
        v_total_sales,
        v_cash_sales,
        v_card_sales,
        v_credit_sales
    FROM invoices
    WHERE shift_id = p_shift_id AND status != 'ملغاة';

    -- حساب النقد المتوقع (العهدة + مبيعات الكاش)
    v_expected_cash := v_starting_cash + v_cash_sales;

    -- تحديث وتشفير بيانات الوردية (يمنع الكاشير من التلاعب)
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
-- 2. دالة ترحيل المصروفات وتوليد القيد المزدوج تلقائياً (Expense Journal)
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
    -- قراءة بيانات المصروف
    SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

    IF v_expense.is_posted THEN
        RAISE EXCEPTION 'هذا المصروف مرحّل مسبقاً ولا يمكن ترحيله مرة أخرى';
    END IF;

    -- حساب القيمة الإجمالية
    v_total_amount := COALESCE(v_expense.total_price, (v_expense.quantity * v_expense.unit_price)) + COALESCE(v_expense.vat_amount, 0);

    -- استخراج ID حساب المصروف (المدين) وحساب الدفع (الدائن) من الأكواد
    -- افتراض أن القيمة مخزنة بصيغة "Code - Name"
    SELECT id INTO v_debit_acc FROM accounts WHERE code = split_part(v_expense.creditor_account, ' - ', 1) LIMIT 1;
    SELECT id INTO v_credit_acc FROM accounts WHERE code = split_part(v_expense.payment_account, ' - ', 1) LIMIT 1;

    -- إذا لم يتم العثور على החساب عبر الكود، نحاول البحث في الحسابات الافتراضية كحماية
    IF v_debit_acc IS NULL THEN
        SELECT id INTO v_debit_acc FROM accounts WHERE account_type = 'expenses' LIMIT 1;
    END IF;
    IF v_credit_acc IS NULL THEN
        SELECT id INTO v_credit_acc FROM accounts WHERE account_type = 'assets' LIMIT 1;
    END IF;

    -- إنشاء رأس القيد (Journal Header)
    INSERT INTO journal_headers (entry_date, description, reference_id, status, fleet_operation_id)
    VALUES (v_expense.exp_date, 'قيد مصروف آلي: ' || v_expense.description, v_expense.id, 'posted', v_expense.fleet_operation_id)
    RETURNING id INTO v_journal_id;

    -- السطر المدين (حساب المصروفات)
    INSERT INTO journal_lines (header_id, account_id, debit, credit, notes, partner_id, fleet_operation_id)
    VALUES (v_journal_id, v_debit_acc, v_total_amount, 0, v_expense.description, v_expense.payee_id, v_expense.fleet_operation_id);

    -- السطر الدائن (حساب النقدية/البنك)
    INSERT INTO journal_lines (header_id, account_id, debit, credit, notes, partner_id, fleet_operation_id)
    VALUES (v_journal_id, v_credit_acc, 0, v_total_amount, 'سداد مصروف: ' || v_expense.description, v_expense.payee_id, v_expense.fleet_operation_id);

    -- تحديث حالة المصروف كـ "مرحّل"
    UPDATE expenses SET is_posted = true WHERE id = p_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ------------------------------------------------------------------------------
-- 3. دالة الاعتماد المباشر لحركات المخزون (Inventory Sync RPC)
-- تقوم بخصم أو إضافة المخزون بمرونة وتدعم المستودعات والسيارات
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_inventory_transaction(p_id UUID)
RETURNS void AS $$
DECLARE
    v_txn RECORD;
    v_exists_wh UUID;
BEGIN
    SELECT * INTO v_txn FROM inventory_transactions WHERE id = p_id;
    
    IF v_txn.status = 'approved' THEN
        RAISE EXCEPTION 'هذه الحركة معتمدة مسبقاً وتم خصمها من المخزون';
    END IF;

    -- حركة إضافة (IN)
    IF v_txn.type IN ('in', 'transfer_in') THEN
        -- تحديث الصنف الرئيسي
        UPDATE inventory_items SET current_quantity = current_quantity + v_txn.quantity WHERE id = v_txn.item_id;
        
        -- تحديث المستودع الفرعي إن وُجد
        IF v_txn.warehouse_id IS NOT NULL THEN
            SELECT id INTO v_exists_wh FROM warehouse_inventory WHERE warehouse_id = v_txn.warehouse_id AND item_id = v_txn.item_id LIMIT 1;
            IF v_exists_wh IS NOT NULL THEN
                UPDATE warehouse_inventory SET quantity = quantity + v_txn.quantity, updated_at = NOW() WHERE id = v_exists_wh;
            ELSE
                INSERT INTO warehouse_inventory (warehouse_id, item_id, quantity) VALUES (v_txn.warehouse_id, v_txn.item_id, v_txn.quantity);
            END IF;
        END IF;

    -- حركة صرف أو مبيعات (OUT)
    ELSIF v_txn.type IN ('out', 'sales_deduction', 'transfer_out') THEN
        -- تحديث الصنف الرئيسي
        UPDATE inventory_items SET current_quantity = current_quantity - v_txn.quantity WHERE id = v_txn.item_id;
        
        -- تحديث المستودع الفرعي إن وُجد
        IF v_txn.warehouse_id IS NOT NULL THEN
            SELECT id INTO v_exists_wh FROM warehouse_inventory WHERE warehouse_id = v_txn.warehouse_id AND item_id = v_txn.item_id LIMIT 1;
            IF v_exists_wh IS NOT NULL THEN
                UPDATE warehouse_inventory SET quantity = quantity - v_txn.quantity, updated_at = NOW() WHERE id = v_exists_wh;
            ELSE
                -- بالسالب لأنه انصرف ولم يكن مسجلاً
                INSERT INTO warehouse_inventory (warehouse_id, item_id, quantity) VALUES (v_txn.warehouse_id, v_txn.item_id, -v_txn.quantity);
            END IF;
        END IF;
    END IF;

    -- اعتماد العملية
    UPDATE inventory_transactions SET status = 'approved' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
