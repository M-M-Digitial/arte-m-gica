-- Registro de gerações de IA (pra cota mensal do Criar com IA)
CREATE TABLE public.geracoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_geracoes_user_mes ON public.geracoes_ia (user_id, created_at);
ALTER TABLE public.geracoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve proprio uso" ON public.geracoes_ia FOR SELECT
  USING (auth.uid() = user_id);
-- escrita só pelo service role (edge function)

-- Configurações do app editáveis pelo painel admin (ex: link de checkout)
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config legivel por todos" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Admins gerenciam config" ON public.app_config FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));;
