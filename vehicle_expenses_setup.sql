-- Add vehicle_id to expenses and journal_lines to track vehicle expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.fleet_vehicles(id);
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.fleet_vehicles(id);

-- If there's an existing view for expenses or similar we don't strictly need to recreate it if it uses SELECT *
-- However, we must ensure post_expenses_bulk transfers vehicle_id! Let's check post_expenses_bulk definition first.
