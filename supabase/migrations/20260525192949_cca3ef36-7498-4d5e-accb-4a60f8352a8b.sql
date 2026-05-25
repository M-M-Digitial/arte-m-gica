DROP POLICY IF EXISTS "Admins can upload to any bucket" ON storage.objects;
CREATE POLICY "Admins can upload to any bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));