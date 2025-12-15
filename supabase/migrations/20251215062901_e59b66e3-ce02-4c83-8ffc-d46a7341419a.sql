-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for storing user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is registered (has profile)
CREATE OR REPLACE FUNCTION public.is_registered_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup - first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  IF user_count = 0 THEN
    -- First user becomes admin
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    -- Subsequent users get 'user' role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for raffle_draws - restrict write to admins, read to registered users
DROP POLICY IF EXISTS "Allow all operations on raffle_draws" ON public.raffle_draws;

CREATE POLICY "Admins can manage raffle_draws"
ON public.raffle_draws
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Registered users can view raffle_draws"
ON public.raffle_draws
FOR SELECT
TO authenticated
USING (public.is_registered_user(auth.uid()));

CREATE POLICY "Public can view raffle_draws with limited data"
ON public.raffle_draws
FOR SELECT
TO anon
USING (true);

-- Update RLS policies for raffle_winners
DROP POLICY IF EXISTS "Allow all operations on raffle_winners" ON public.raffle_winners;

CREATE POLICY "Admins can manage raffle_winners"
ON public.raffle_winners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Registered users can view raffle_winners"
ON public.raffle_winners
FOR SELECT
TO authenticated
USING (public.is_registered_user(auth.uid()));

CREATE POLICY "Public can view raffle_winners"
ON public.raffle_winners
FOR SELECT
TO anon
USING (true);