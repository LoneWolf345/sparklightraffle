-- Add profile photo URL column to entra_users table
ALTER TABLE public.entra_users 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;