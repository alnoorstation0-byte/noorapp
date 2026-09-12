-- 1. Create Promotions Table
CREATE TABLE public.promotions (
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

CREATE POLICY "Enable read access for all users" ON public.promotions
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.promotions
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Add to realtime if needed
-- alter publication supabase_realtime add table public.promotions;
