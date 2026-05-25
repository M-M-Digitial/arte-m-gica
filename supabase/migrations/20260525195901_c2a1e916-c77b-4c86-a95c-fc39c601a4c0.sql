
CREATE TABLE public.modelos_prontos_temas (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.modelos_prontos_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_slug TEXT NOT NULL REFERENCES public.modelos_prontos_temas(slug) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theme_slug, file_name)
);

CREATE INDEX idx_mp_arquivos_theme ON public.modelos_prontos_arquivos(theme_slug);

ALTER TABLE public.modelos_prontos_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos_prontos_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temas visíveis a todos" ON public.modelos_prontos_temas FOR SELECT USING (true);
CREATE POLICY "Arquivos visíveis a todos" ON public.modelos_prontos_arquivos FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam temas" ON public.modelos_prontos_temas
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins gerenciam arquivos" ON public.modelos_prontos_arquivos
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
