-- 0. Add missing column fleet_operation_id to receipt_vouchers
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipt_vouchers' AND column_name = 'fleet_operation_id') THEN
        ALTER TABLE public.receipt_vouchers ADD COLUMN fleet_operation_id uuid REFERENCES public.fleet_operations(id);
    END IF;
END $$;

-- 1. Fix invoices with paid_amount > 0 but payment_status = 'unpaid'
UPDATE public.invoices
SET payment_status = CASE
    WHEN paid_amount >= total_amount AND total_amount > 0 THEN 'paid'
    WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'
    ELSE 'unpaid'
END
WHERE payment_status = 'unpaid' AND paid_amount > 0;

-- 2. Fix receipt_vouchers without shift_id
UPDATE public.receipt_vouchers rv
SET shift_id = inv.shift_id,
    fleet_operation_id = inv.fleet_operation_id
FROM public.invoices inv
WHERE rv.invoice_id = inv.id
  AND rv.shift_id IS NULL
  AND inv.shift_id IS NOT NULL
  AND rv.receipt_number LIKE 'RV-POS-%';

-- 3. Constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_warehouse_inventory_item') THEN
        ALTER TABLE public.warehouse_inventory ADD CONSTRAINT uq_warehouse_inventory_item UNIQUE (warehouse_id, item_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_vehicle_inventory_item') THEN
        ALTER TABLE public.vehicle_inventory ADD CONSTRAINT uq_vehicle_inventory_item UNIQUE (fleet_operation_id, item_id);
    END IF;
END $$;

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE (is_read = false);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages (receiver_id) WHERE (is_read = false);
CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON public.invoices (shift_id);
CREATE INDEX IF NOT EXISTS idx_invoices_warehouse_id ON public.invoices (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_invoices_partner_date ON public.invoices (partner_id, date);
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_shift_id ON public.receipt_vouchers (shift_id);
CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_invoice_id ON public.receipt_vouchers (invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_shift_id ON public.expenses (shift_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_warehouse_item ON public.inventory_transactions (warehouse_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_shift_id ON public.inventory_transactions (shift_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_header ON public.journal_lines (header_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines (account_id);
CREATE INDEX IF NOT EXISTS idx_wh_inv_wh_item ON public.warehouse_inventory (warehouse_id, item_id);
CREATE INDEX IF NOT EXISTS idx_partners_type_active ON public.partners (partner_type) WHERE (is_active = true);

-- 5. Setup Realtime for the required tables
DO $$
DECLARE 
    tbl text;
    tables text[] := ARRAY[
        'notifications','messages','user_tasks','user_requests',
        'invoices','expenses','receipt_vouchers','payment_vouchers',
        'inventory_transactions','inventory_items','warehouse_inventory',
        'vehicle_inventory','warehouses','partners','accounts',
        'fleet_operations','fleet_vehicles','pos_shifts',
        'journal_headers','journal_lines','manual_journals','cash_flows'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_table THEN NULL;
        END;
    END LOOP;
END $$;
