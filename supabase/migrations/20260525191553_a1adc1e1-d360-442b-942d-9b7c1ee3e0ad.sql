
CREATE TABLE public.upload_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total int NOT NULL DEFAULT 0,
  success int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  register_in_moldes boolean NOT NULL DEFAULT false,
  default_category text NOT NULL DEFAULT 'Geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upload_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view their own jobs"
ON public.upload_jobs FOR SELECT
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
