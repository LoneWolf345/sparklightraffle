-- Create storage bucket for prize images
INSERT INTO storage.buckets (id, name, public) VALUES ('prize-images', 'prize-images', true);

-- Storage policies for prize images
CREATE POLICY "Admins can upload prize images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prize images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prize images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'prize-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view prize images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'prize-images');

-- Add prizes column to raffle_draws table
ALTER TABLE public.raffle_draws
ADD COLUMN prizes JSONB DEFAULT NULL;