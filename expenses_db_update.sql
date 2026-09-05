-- 1. إزالة شرط الـ UNIQUE من عمود expense_number للسماح بتكراره للبنود التي تنتمي لنفس الإذن
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

-- 2. تحديث دالة RPC لحفظ المصروفات بسطور متعددة وتوليد رقم إذن تلقائي
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
    -- توليد رقم الإذن إذا كان عملية إدخال جديدة
    IF p_id IS NULL THEN
        -- الصيغة: EXP-YYYYMMDD-Random
        generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    ELSE
        -- في حالة التعديل، نحتفظ بالرقم القديم ونحذف الأسطر القديمة المرتبطة به لإعادة إدخالها
        SELECT expense_number INTO generated_expense_number FROM public.expenses WHERE id = p_id LIMIT 1;
        
        IF generated_expense_number IS NOT NULL THEN
            DELETE FROM public.expenses WHERE expense_number = generated_expense_number;
        ELSE
            -- لو لسبب ما مفيش رقم، نعمله رقم جديد
            generated_expense_number := 'EXP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
        END IF;
    END IF;

    -- تجهيز مصفوفة البنود
    IF p_lines_data IS NULL OR jsonb_array_length(p_lines_data) = 0 THEN
        -- إذا لم يكن هناك بنود إضافية، نعتبر البيانات الأساسية كبند وحيد
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

    -- الدوران على البنود وإدخالها كسطور منفصلة في الداتابيز
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
            lines_data -- نحتفظ بها فارغة لأننا فصلنا البنود
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
