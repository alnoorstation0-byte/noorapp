
CREATE TABLE IF NOT EXISTS public.pos_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  delegate_id uuid,
  warehouse_id uuid,
  opened_at timestamp with time zone DEFAULT now() NOT NULL,
  closed_at timestamp with time zone,
  starting_cash numeric DEFAULT 0 NOT NULL,
  expected_cash numeric DEFAULT 0,
  actual_cash numeric DEFAULT 0,
  total_sales numeric DEFAULT 0,
  total_cash_sales numeric DEFAULT 0,
  total_card_sales numeric DEFAULT 0,
  total_credit_sales numeric DEFAULT 0,
  shortage_overage numeric DEFAULT 0,
  status character varying DEFAULT 'open'::character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.pos_shifts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pos_shifts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.pos_shifts;

CREATE POLICY "Enable read access for all users" ON public.pos_shifts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.pos_shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.pos_shifts FOR UPDATE USING (true);
