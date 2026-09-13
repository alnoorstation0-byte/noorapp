-- 🛠️ ملف ربط المفاتيح الأجنبية لقاعدة البيانات في Supabase
-- تشغيل هذا الملف يضمن التكامل المباشر بين الفواتير والمستودعات والورديات

DO $$
BEGIN
  -- 1. ربط الفواتير بالمستودعات
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;

  -- 2. ربط الفواتير بالمناديب والشركاء
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_delegate_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_delegate_id_fkey
    FOREIGN KEY (delegate_id) REFERENCES public.partners(id) ON DELETE SET NULL;
  END IF;

  -- 3. ربط الورديات بالمستودعات
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pos_shifts_warehouse_id_fkey'
  ) THEN
    ALTER TABLE public.pos_shifts
    ADD CONSTRAINT pos_shifts_warehouse_id_fkey
    FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
  END IF;

  -- 4. ربط الورديات بالمناديب
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pos_shifts_delegate_id_fkey'
  ) THEN
    ALTER TABLE public.pos_shifts
    ADD CONSTRAINT pos_shifts_delegate_id_fkey
    FOREIGN KEY (delegate_id) REFERENCES public.partners(id) ON DELETE SET NULL;
  END IF;
END $$;
