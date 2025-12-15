-- Drop the existing SELECT policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can view app_settings" ON public.app_settings;

-- Create a new policy that allows public read access for branding settings
CREATE POLICY "Public can view branding settings" 
ON public.app_settings 
FOR SELECT 
USING (key LIKE 'company_%');