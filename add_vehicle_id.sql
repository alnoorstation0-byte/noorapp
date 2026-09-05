-- Add vehicle_id to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.fleet_vehicles(id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
