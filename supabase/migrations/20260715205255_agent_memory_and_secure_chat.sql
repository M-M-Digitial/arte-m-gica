CREATE TABLE public.agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT agent_memories_user_agent_key UNIQUE (user_id, agent_id),
  CONSTRAINT agent_memories_agent_id_check CHECK (
    agent_id IN ('shared', 'nina', 'jade', 'iris', 'clara', 'violeta', 'sofia', 'bella', 'elisa', 'maia')
  ),
  CONSTRAINT agent_memories_summary_length_check CHECK (char_length(summary) <= 8000),
  CONSTRAINT agent_memories_facts_array_check CHECK (jsonb_typeof(facts) = 'array')
);

CREATE INDEX agent_memories_user_id_idx ON public.agent_memories (user_id);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agent memory"
ON public.agent_memories FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create their own agent memory"
ON public.agent_memories FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own agent memory"
ON public.agent_memories FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own agent memory"
ON public.agent_memories FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER update_agent_memories_updated_at
BEFORE UPDATE ON public.agent_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON TABLE public.agent_memories FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agent_memories TO authenticated;

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversas;
CREATE POLICY "Users can update their own conversations"
ON public.conversas FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.conversas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversas TO authenticated;

UPDATE storage.buckets
SET public = false
WHERE id = 'chat-uploads';

DROP POLICY IF EXISTS "Allow public uploads to chat-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to chat-uploads" ON storage.objects;

CREATE POLICY "Users can read their own chat uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can create their own chat uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their own chat uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their own chat uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-uploads'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);
