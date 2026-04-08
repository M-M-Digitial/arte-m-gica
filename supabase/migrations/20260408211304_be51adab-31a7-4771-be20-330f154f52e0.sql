
-- Create storage bucket for generated arts
INSERT INTO storage.buckets (id, name, public) VALUES ('artes-geradas', 'artes-geradas', true);

-- Public read access
CREATE POLICY "Generated arts are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'artes-geradas');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload generated arts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artes-geradas' AND auth.role() = 'authenticated');

-- Users can delete their own files
CREATE POLICY "Users can delete their own generated arts"
ON storage.objects FOR DELETE
USING (bucket_id = 'artes-geradas' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add arte_url column to projetos
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS arte_url text;
