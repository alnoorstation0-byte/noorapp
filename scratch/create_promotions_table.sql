-- 1. Create Promotions Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL, -- 'BOGO', 'THRESHOLD', 'CROSS_SELLING', 'TIERED', 'BUNDLE'
    status character varying(20) DEFAULT 'active' NOT NULL, -- 'active', 'inactive', 'scheduled', 'expired'
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    conditions jsonb DEFAULT '{}'::jsonb, -- e.g., {"buy_item_id": "...", "buy_qty": 2}
    rewards jsonb DEFAULT '{}'::jsonb, -- e.g., {"get_item_id": "...", "discount_percentage": 100}
    priority integer DEFAULT 0, -- Higher priority runs first
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Add RLS Policies
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.promotions;
CREATE POLICY "Enable read access for all users" ON public.promotions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.promotions;
CREATE POLICY "Enable all access for authenticated users" ON public.promotions
    FOR ALL USING (auth.role() = 'authenticated');

-- Fallback policy allowing application operations if running without Supabase JWT
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.promotions;
CREATE POLICY "Enable all operations for all users" ON public.promotions
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Add to Realtime (optional if publication exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;
