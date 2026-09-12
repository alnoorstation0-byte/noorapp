-- ==============================================================================
-- 🛡️ حماية الورديات ونقاط البيع (POS Shift Protection & Concurrency Lock)
-- يمنع وجود أكثر من وردية مفتوحة في نفس المستودع في نفس الوقت
-- ويمنع المندوب من فتح أكثر من وردية نشطة في نفس الوقت
-- يُرجى نسخ هذا الكود ولصقه في Supabase SQL Editor ثم الضغط على Run
-- ==============================================================================

-- 1. فهرس فريد مشروط لمنع فتح ورديتين لنفس المستودع في نفس الوقت
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_single_open_warehouse
ON public.pos_shifts (warehouse_id)
WHERE (status = 'open');

-- 2. فهرس فريد مشروط لمنع المندوب من فتح أكثر من وردية في نفس الوقت
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_shifts_single_open_delegate
ON public.pos_shifts (delegate_id)
WHERE (status = 'open' AND delegate_id IS NOT NULL);

-- 3. دالة وتريجر ذكي لتقديم رسائل خطأ عربية واضحة ومفصلة
CREATE OR REPLACE FUNCTION check_single_open_pos_shift()
RETURNS TRIGGER AS $$
DECLARE
    v_existing_shift_id UUID;
    v_existing_delegate_name TEXT;
    v_existing_opened_at TIMESTAMPTZ;
    v_warehouse_name TEXT;
BEGIN
    -- الفحص يعمل فقط إذا كانت الوردية المراد حفظها حالتها مفتوحة (open)
    IF NEW.status = 'open' THEN
        -- جلب اسم المستودع للتوضيح في رسالة الخطأ
        SELECT name INTO v_warehouse_name FROM public.warehouses WHERE id = NEW.warehouse_id;

        -- 1. فحص المستودع: هل توجد أي وردية مفتوحة حالياً في هذا المستودع؟
        SELECT s.id, COALESCE(p.name, 'مبيعات مباشرة'), s.opened_at
        INTO v_existing_shift_id, v_existing_delegate_name, v_existing_opened_at
        FROM public.pos_shifts s
        LEFT JOIN public.partners p ON p.id = s.delegate_id
        WHERE s.warehouse_id = NEW.warehouse_id
          AND s.status = 'open'
          AND (TG_OP = 'INSERT' OR s.id != NEW.id)
        LIMIT 1;

        IF v_existing_shift_id IS NOT NULL THEN
            RAISE EXCEPTION '⚠️ عذراً، لا يمكن فتح وردية جديدة في مستودع (%)! توجد بالفعل وردية نشطة مفتوحة حالياً برقم (#%) والمسؤول عنها: (%). يجب إنهاء وتقفيل الوردية الحالية أولاً قبل بدء وردية جديدة.',
                COALESCE(v_warehouse_name, 'المحدد'),
                SUBSTRING(v_existing_shift_id::TEXT, 1, 8),
                v_existing_delegate_name;
        END IF;

        -- 2. فحص المندوب: هل المندوب المختار لديه بالفعل وردية مفتوحة في مستودع آخر؟
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
                RAISE EXCEPTION '⚠️ لا يمكن فتح الوردية! هذا المندوب لديه بالفعل وردية نشطة مفتوحة حالياً في منفذ (%) برقم (#%). يجب تقفيل الوردية السابقة أولاً.',
                    COALESCE(v_warehouse_name, 'آخر'),
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
-- 4. تريجر أمان: منع إصدار أي فاتورة نقطة بيع بدون ربطها بوردية نشطة ومفتوحة
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_pos_invoice_shift_required()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_status TEXT;
BEGIN
    -- إذا كانت الفاتورة صادرة من نقطة بيع
    IF (NEW.invoice_number LIKE 'INV-POS-%' OR NEW.shift_id IS NOT NULL) THEN
        IF NEW.shift_id IS NULL THEN
            RAISE EXCEPTION '⛔ منع أمني: لا يمكن إصدار أي فاتورة نقطة بيع بدون بدء وفتح الوردية أولاً! يجب فتح الوردية وربط الفاتورة بها.';
        END IF;

        -- التأكد من أن الوردية المربوطة مفتوحة وليست مغلقة
        SELECT status INTO v_shift_status FROM public.pos_shifts WHERE id = NEW.shift_id;
        IF v_shift_status != 'open' THEN
            RAISE EXCEPTION '⛔ الوردية المحددة مغلقة حالياً! لا يمكن تسجيل فواتير على وردية تم إغلاقها وتقفيل صندوقها.';
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

