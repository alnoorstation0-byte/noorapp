-- ربط السندات برحلة التوزيع لتكتمل الدورة المستندية
ALTER TABLE public.receipt_vouchers ADD COLUMN IF NOT EXISTS fleet_operation_id uuid REFERENCES public.fleet_operations(id) ON DELETE SET NULL;
ALTER TABLE public.payment_vouchers ADD COLUMN IF NOT EXISTS fleet_operation_id uuid REFERENCES public.fleet_operations(id) ON DELETE SET NULL;
