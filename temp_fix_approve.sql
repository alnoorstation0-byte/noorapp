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
        RAISE EXCEPTION 'الحركة غير موجودة';
    END IF;

    IF v_txn.status = 'approved' THEN
        RAISE EXCEPTION 'الحركة معتمدة مسبقاً';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_unit_price := COALESCE(v_txn.unit_price, 0);
    v_total_amount := v_qty * v_unit_price;
    v_tax_amount := COALESCE(v_txn.tax_amount, 0);

    v_full_desc := 'صنف: ' || COALESCE(v_txn.item_name, 'غير محدد') || 
                   ' | كمية: ' || v_qty || 
                   ' | جهة: ' || COALESCE(v_txn.partner_name, 'بدون') || 
                   ' | رحلة: #' || COALESCE(v_txn.operation_number, 'بدون');

    IF COALESCE(v_txn.partner_type, '') IN ('delegate', 'employee') THEN
        v_partner_acc_id := v_delegate_custody_acc_id;
    ELSE
        v_partner_acc_id := COALESCE(v_txn.partner_acc, CASE WHEN v_txn.type IN ('in', 'transfer_in') THEN 'c4b01e7f-b892-4517-bdc9-7cc97d8112f6'::uuid ELSE '4f828d0d-a1f4-4762-83e3-c17dafae802d'::uuid END);
    END IF;

    -- Use the transaction's warehouse_id or default to main warehouse
    v_target_warehouse_id := COALESCE(v_txn.warehouse_id, '11111111-1111-1111-1111-111111111111'::uuid);

    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_txn.vehicle_id);

        INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
        VALUES (v_txn.transaction_date, 'تحميل عهدة مندوب - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
        RETURNING id INTO v_journal_id;

        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_delegate_custody_acc_id, v_txn.driver_id, v_total_amount, 0, 'تحميل عهدة (مدين)');
        
        INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
        VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'صرف من المستودع (دائن)');
    ELSE
        IF v_txn.type IN ('in', 'transfer_in') THEN
            PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'توريد مخزني - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, v_total_amount, 0, 'استلام للمستودع (مدين)');
            
            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, 0, v_total_amount, 'فواتير قيد الاستلام (دائن)');
            
        ELSE
            PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_target_warehouse_id);

            INSERT INTO public.journal_headers (entry_date, description, status, v_type, reference_id)
            VALUES (v_txn.transaction_date, 'صرف مخزني - ' || COALESCE(v_txn.transaction_number,'') || ' - ' || v_full_desc, 'posted', 'inventory', v_txn.id)
            RETURNING id INTO v_journal_id;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_partner_acc_id, v_txn.partner_id, v_total_amount + v_tax_amount, 0, 'استحقاق مدين (ذمة)');
            
            IF v_tax_amount > 0 THEN
                INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
                VALUES (v_journal_id, v_vat_acc_id, NULL, 0, v_tax_amount, 'ضريبة مخرجات (دائن)');
            END IF;

            INSERT INTO public.journal_lines (header_id, account_id, partner_id, debit, credit, notes)
            VALUES (v_journal_id, v_inv_acc_id, NULL, 0, v_total_amount, 'صرف من المستودع (دائن)');
        END IF;
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
        RAISE EXCEPTION 'الحركة غير موجودة';
    END IF;

    IF v_txn.status != 'approved' THEN
        RAISE EXCEPTION 'الحركة غير معتمدة مسبقاً';
    END IF;

    v_qty := COALESCE(v_txn.quantity, 0);
    v_target_warehouse_id := COALESCE(v_txn.warehouse_id, '11111111-1111-1111-1111-111111111111'::uuid);

    -- Reverse inventory quantities
    IF v_txn.fleet_operation_id IS NOT NULL AND v_txn.vehicle_id IS NOT NULL THEN
        PERFORM public.update_inventory_quantity(v_txn.item_id, v_qty, v_target_warehouse_id);
        PERFORM public.update_inventory_quantity(v_txn.item_id, -v_qty, v_txn.vehicle_id);
    ELSE
        IF v_txn.type IN ('in', 'transfer_in') THEN
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
