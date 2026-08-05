-- Perfil do ateliê: a IA precisa conhecer a usuária antes de sugerir qualquer coisa
-- (feedback 2026-07-20: nada de assumir "topper e forminha" — ela pode trabalhar
--  com encadernação, feltro, apliques... e nunca sugerir preço)
CREATE TABLE public.atelie_perfil (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  atelie_nome text,
  produtos text NOT NULL,           -- o que ela vende (livre: "caixas personalizadas, topos..." )
  publico text,                     -- pra quem vende (mães, festas infantis, corporativo...)
  ticket_medio text,                -- faixa de preço típica dos pedidos
  canais text,                      -- onde vende (WhatsApp, Instagram, Elo7, feira...)
  cidade text,
  observacoes text,                 -- equipamentos, estilo, o que NÃO faz, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atelie_perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuaria gerencia proprio perfil" ON public.atelie_perfil
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_atelie_perfil_updated_at BEFORE UPDATE ON public.atelie_perfil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();;
