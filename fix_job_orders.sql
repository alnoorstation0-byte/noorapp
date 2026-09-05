-- الرجاء تشغيل هذا الكود في محرر SQL داخل Supabase لإضافة العمود الناقص

ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS executor_type text DEFAULT 'تنفيذ ذاتي';

-- تأكد أيضاً من إضافة الحقل إلى الصلاحيات إذا لزم الأمر
