-- Add draw_name and organizer_email columns to raffle_draws table
ALTER TABLE public.raffle_draws 
ADD COLUMN draw_name TEXT DEFAULT NULL,
ADD COLUMN organizer_email TEXT DEFAULT NULL;