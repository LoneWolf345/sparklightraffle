-- Create table for storing raffle draws
CREATE TABLE public.raffle_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dataset_checksum TEXT NOT NULL,
  seed TEXT NOT NULL,
  config JSONB NOT NULL,
  total_participants INTEGER NOT NULL,
  total_tickets INTEGER NOT NULL,
  participants JSONB NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false
);

-- Create table for storing winners
CREATE TABLE public.raffle_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_draw_id UUID NOT NULL REFERENCES public.raffle_draws(id) ON DELETE CASCADE,
  draw_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  entries INTEGER NOT NULL,
  is_bonus_prize BOOLEAN NOT NULL DEFAULT false,
  drawn_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(raffle_draw_id, draw_number)
);

-- Enable Row Level Security (public access since no user auth required)
ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (internal tool, no auth required)
CREATE POLICY "Allow all operations on raffle_draws" 
ON public.raffle_draws 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on raffle_winners" 
ON public.raffle_winners 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_raffle_draws_created_at ON public.raffle_draws(created_at DESC);
CREATE INDEX idx_raffle_winners_draw_id ON public.raffle_winners(raffle_draw_id);