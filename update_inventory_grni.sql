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
    
    -- حسابات ثابتة
    v_inv_acc_id uuid := 'c5efa035-c8d5-4d13-bf33-7c7cd854f393'::uuid; -- مخزون الخامات البضائع
    v_delegate_custody_acc_id uuid := 'f9c7ba68-6998-48e6-99b3-3a4526d820a1'::uuid; -- عهدة موظفين او مناديب (ذمة المندوب)
    v_grni_acc_id uuid := 'c4b01e7f-b892-4517-bdc9-7cc97d8112f6'::uuid; -- فواتير قيد الاستلام (GRNI)
    
    v_partner_acc_id uuid;
BEGIN
    -- جلب بيانات الحركة الشاملة
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
    WHERE t.id = p_id AND (t.status IS NULL OR t.status = 'pending' OR t.status = 'مسودة');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحركة غير موجودة أو معتمدة مسبقاً';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_total_amount := v_qty * COALESCE(v_txn.unit_price, 0);
    
    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'يرجى التأكد من سعر الوحدة والكمية، إجمالي القيمة يجب أن يكون أكبر من صفر';
    END IF;

    -- بناء الوصف الشامل
    v_full_desc := 'صنف: ' || COALESCE(v_txn.item_name, 'غير محدد') || 
                   ' | كمية: ' || v_qty || 
                   ' | جهة: ' || COALESCE(v_txn.partner_name, 'بدون') || 
                   ' | مندوب: ' || COALESCE(v_txn.driver_name, 'بدون') || 
                   ' | سيارة: ' || COALESCE(v_txn.vehicle_plate, 'بدون') || 
                   ' | رحلة: #' || COALESCE(v_txn.operation_number, 'بدون');

    -- تحديد حساب المورد/العميل أو المندوب
    IF COALESCE(v_txn.partner_type, '') IN ('delegate', 'employee') THEN
        v_partner_acc_id := v_delegate_custody_acc_id; -- عهدة المندوب
    ELSIF v_txn.type = 'in' THEN
        -- هنا التغيير المهم: استخدام الحساب الوسيط (فواتير قيد الاستلام) بدلاً من حساب المورد مباشرة
        v_partner_acc_id := v_grni_acc_id;
    ELSE
        -- للمنصرف، نعتمد حساب العميل أو الافتراضي
        v_partner_acc_id := COALESCE(v_txn.partner_acc, '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid);
    END IF;

    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        -- ==========================================
        -- مسار عهدة المندوب (الأسطول / نقل مباشر لسيارة)
        -- ==========================================
        -- 1. خصم من المخزون الرئيسي
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, NULL);
        -- 2. إضافة إلى سيارة المندوب (كمستودع متنقل)
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_txn.vehicle_id);

        -- 3. إنشاء رأس القيد
        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'تحميل عهدة مندوب - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        -- 4. سطور القيد (المدين هو المندوب شخصياً في حساب عهد الموظفين)
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_delegate_custody_acc_id, v_txn.driver_id, v_total_amount, 0, 'تحميل عهدة (مدين / ذمة المندوب) - ' || v_full_desc);
        
        -- 5. (الدائن هو مخزون البضائع) نجعل partner_id = NULL حتى لا يظهر في كشف حساب المندوب ويفره
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'صرف من المستودع (دائن) - ' || v_full_desc);

    ELSE
        -- ==========================================
        -- المسار العادي (مورد / عميل / أو صرف يدوي لمندوب)
        -- ==========================================
        IF v_txn.type IN ('in', 'transfer_in') THEN
            -- توريد للمخزون
            PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, NULL);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'توريد مخزني (شراء) - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, v_total_amount, 0, 'استلام للمستودع (مدين) - ' || v_full_desc);
            
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, 0, v_total_amount, 'حساب وسيط قيد الاستلام (دائن) - ' || v_full_desc);
        ELSE
            -- صرف من المخزون
            PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, NULL);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'صرف مخزني - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, v_total_amount, 0, 'استحقاق مدين (ذمة) - ' || v_full_desc);
            
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'صرف من المستودع (دائن) - ' || v_full_desc);
        END IF;
    END IF;

    -- تحديث حالة الحركة
    UPDATE public.inventory_transactions SET status = 'approved', journal_id = v_journal_id WHERE id = p_id;
END;
$$;
