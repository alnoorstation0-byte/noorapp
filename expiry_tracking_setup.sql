-- ==============================================================================
-- ⏳ سكريبت ترقية قاعدة البيانات: إضافة حقول تتبع الصلاحيات والتشغيلات
-- Expiry Dates & Batch Tracking Setup for taj-mawadah-app
-- ==============================================================================

-- 1. إضافة أعمدة تاريخ الصلاحية ورقم التشغيلة وتاريخ الإنتاج لجدول الأصناف
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS expiry_date date,
ADD COLUMN IF NOT EXISTS production_date date,
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS alert_before_days integer DEFAULT 30;

-- 2. فهرس لتسريع استعلامات وفرز تواريخ الصلاحية
CREATE INDEX IF NOT EXISTS idx_inventory_items_expiry_date ON public.inventory_items(expiry_date);

-- 3. تحديث تعليقات الأعمدة للتوثيق
COMMENT ON COLUMN public.inventory_items.expiry_date IS 'تاريخ انتهاء صلاحية الصنف';
COMMENT ON COLUMN public.inventory_items.production_date IS 'تاريخ إنتاج الصنف';
COMMENT ON COLUMN public.inventory_items.batch_number IS 'رقم التشغيلة أو الدفعة (Lot/Batch Number)';
COMMENT ON COLUMN public.inventory_items.alert_before_days IS 'عدد الأيام للتنبيه المسبق قبل انتهاء الصلاحية';
