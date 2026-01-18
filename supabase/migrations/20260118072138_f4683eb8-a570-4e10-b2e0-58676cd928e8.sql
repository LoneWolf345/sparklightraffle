-- Create WIA users table for Windows Integrated Authentication
CREATE TABLE IF NOT EXISTS public.wia_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  windows_username TEXT NOT NULL,
  domain TEXT,
  email TEXT,
  display_name TEXT,
  department TEXT,
  job_title TEXT,
  auth_user_id UUID,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(windows_username, domain)
);

-- Enable RLS
ALTER TABLE public.wia_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own WIA record
CREATE POLICY "Users can view own WIA record" ON public.wia_users
  FOR SELECT USING (auth_user_id = auth.uid());

-- Admins can manage all WIA users
CREATE POLICY "Admins can manage WIA users" ON public.wia_users
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_wia_users_username_domain ON public.wia_users(windows_username, domain);
CREATE INDEX idx_wia_users_auth_user_id ON public.wia_users(auth_user_id);