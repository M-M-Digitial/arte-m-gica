-- Leads do quiz de cartonagem (Atelier Lívia Viti) — estrutura espelhada no quiz de empresários
create table if not exists public.carto_leads (
  session_id text primary key,
  data_inicio timestamptz not null default now(),
  ultima_atualizacao timestamptz not null default now(),
  nome text, whatsapp text, email text,
  idade text,
  promessa text,
  experiencia text,
  dificuldade text,
  finalidade text,
  desejo text,
  renda text,
  comprometimento text,
  pagamento text,
  score integer,
  classificacao text,
  eliminado text,
  concluido text default 'NÃO',
  etapa text,
  clicou_whatsapp text,
  no_grupo text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  device text,
  whatsapp_norm text,
  zap_chave text generated always as (public.zap_chave(whatsapp)) stored
);
alter table public.carto_leads enable row level security;
create index if not exists carto_leads_atualizacao_idx on public.carto_leads (ultima_atualizacao desc);
create index if not exists carto_leads_zapchave_idx on public.carto_leads (zap_chave);

-- custos por campanha deste projeto
create table if not exists public.carto_custos (
  campanha text primary key,
  gasto numeric not null default 0,
  atualizado timestamptz not null default now()
);
alter table public.carto_custos enable row level security;;
