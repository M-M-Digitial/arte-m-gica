CREATE POLICY "Admins create their own jobs"
ON public.upload_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update their own jobs"
ON public.upload_jobs
FOR UPDATE
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));