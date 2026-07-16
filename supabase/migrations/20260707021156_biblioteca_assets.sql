-- Biblioteca de assets por tema (papéis, cliparts, fontes, placas)
CREATE TABLE public.tema_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('papel','clipart','fonte','placa')),
  name text NOT NULL,
  url text NOT NULL,
  role text,                -- ex: 'top' (papel das abas), 'body' (corpo), 'principal', 'amigo'
  meta jsonb NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (theme_slug, kind, name)
);
ALTER TABLE public.tema_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Assets visíveis a todos" ON public.tema_assets FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam assets" ON public.tema_assets FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_tema_assets_slug ON public.tema_assets(theme_slug);

-- Artefatos de composição por molde (SVG vetorial, máscara de interior, faces)
ALTER TABLE public.moldes
  ADD COLUMN IF NOT EXISTS svg_url text,
  ADD COLUMN IF NOT EXISTS mask_url text,
  ADD COLUMN IF NOT EXISTS faces_url text;;
