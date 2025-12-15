-- Add branding columns to raffle_draws table
ALTER TABLE public.raffle_draws 
ADD COLUMN logo_url TEXT,
ADD COLUMN event_banner_url TEXT,
ADD COLUMN use_event_banner BOOLEAN NOT NULL DEFAULT false;