INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true);

CREATE POLICY "Allow public uploads to chat-uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'chat-uploads');

CREATE POLICY "Allow public read access to chat-uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-uploads');