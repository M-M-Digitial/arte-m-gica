
CREATE POLICY "Admins can insert into any bucket"
ON storage.objects FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any object"
ON storage.objects FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any object"
ON storage.objects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
