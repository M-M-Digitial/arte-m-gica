-- Chave de casamento materializada (à prova do nono dígito) para o webhook casar rápido por WhatsApp
alter table public.quiz_leads
  add column if not exists zap_chave text generated always as (public.zap_chave(whatsapp)) stored;
create index if not exists quiz_leads_zapchave_idx on public.quiz_leads (zap_chave);

-- Log cru dos webhooks recebidos (para eu ajustar ao formato real do DevZapp)
create table if not exists public.quiz_grupo_log (
  id bigint generated always as identity primary key,
  recebido timestamptz not null default now(),
  payload jsonb,
  interpretado jsonb
);
alter table public.quiz_grupo_log enable row level security;;
