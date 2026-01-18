-- Add job_title and department columns to entra_users table
ALTER TABLE public.entra_users 
ADD COLUMN job_title TEXT,
ADD COLUMN department TEXT;