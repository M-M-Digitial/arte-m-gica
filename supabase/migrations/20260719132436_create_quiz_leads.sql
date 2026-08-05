-- Tabela de leads do Quiz Empresários (Aula Privada / Renan Teixeira)
create table if not exists public.quiz_leads (
  session_id text primary key,
  data_inicio timestamptz not null default now(),
  ultima_atualizacao timestamptz not null default now(),
  nome text,
  whatsapp text,
  email text,
  idade text,
  promessa text,
  dor text,
  urgencia text,
  desejo text,
  faturamento text,
  investimento text,
  pagamento text,
  score integer,
  classificacao text,
  eliminado text,
  concluido text default 'NÃO',
  etapa text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device text
);

-- Acesso somente via Edge Function (service role); nenhuma policy pública
alter table public.quiz_leads enable row level security;

create index if not exists quiz_leads_atualizacao_idx on public.quiz_leads (ultima_atualizacao desc);;
