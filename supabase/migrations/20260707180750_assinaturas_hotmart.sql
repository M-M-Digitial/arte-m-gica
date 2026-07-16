-- Assinaturas (fonte: webhook Hotmart; chave de match = e-mail do comprador)
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'inactive', -- active | canceled | refunded | chargeback | expired | inactive
  plano text,
  origem text NOT NULL DEFAULT 'hotmart',
  hotmart_transaction text,
  hotmart_subscriber text,
  valid_until timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_assinaturas_email ON public.assinaturas (lower(email));
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- usuário vê a própria assinatura (match por e-mail do JWT)
CREATE POLICY "Usuario ve propria assinatura" ON public.assinaturas FOR SELECT
  USING (lower(email) = lower(coalesce(auth.jwt()->>'email','')));
-- admins gerenciam tudo
CREATE POLICY "Admins gerenciam assinaturas" ON public.assinaturas FOR ALL
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- usuário de teste: assinatura ativa + papel admin (pra validar painel e gates)
INSERT INTO public.assinaturas (email, status, plano, origem, valid_until)
VALUES ('teste@moldepronto.local', 'active', 'anual', 'manual', now() + interval '1 year');
INSERT INTO public.user_roles (user_id, role)
VALUES ('693adea6-e729-4529-90b9-fb5626f474a7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;;
