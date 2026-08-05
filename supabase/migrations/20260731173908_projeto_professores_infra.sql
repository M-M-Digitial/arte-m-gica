-- Projeto PROFESSORES (isolado do Renan). Tabelas prof_* espelham as quiz_*.
create table if not exists public.prof_leads (
  session_id text primary key,
  data_inicio timestamptz not null default now(),
  ultima_atualizacao timestamptz not null default now(),
  nome text, whatsapp text, email text,
  idade text, promessa text, materiais text, dor text, urgencia text,
  renda text, investimento text, pagamento text,
  score integer, classificacao text, eliminado text,
  concluido text default 'NÃO', etapa text,
  clicou_whatsapp text, no_grupo text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  device text,
  whatsapp_norm text,
  zap_chave text generated always as (public.zap_chave(whatsapp)) stored
);
alter table public.prof_leads enable row level security;
create index if not exists prof_leads_atualizacao_idx on public.prof_leads (ultima_atualizacao desc);
create index if not exists prof_leads_zap_idx on public.prof_leads (whatsapp_norm);
create index if not exists prof_leads_zapchave_idx on public.prof_leads (zap_chave);

create table if not exists public.prof_custos (
  campanha text primary key, gasto numeric not null default 0, atualizado timestamptz not null default now()
);
alter table public.prof_custos enable row level security;

create table if not exists public.prof_paginas (
  nome text primary key, html text not null, atualizado timestamptz not null default now()
);
alter table public.prof_paginas enable row level security;

create table if not exists public.prof_grupo (
  telefone text primary key, chave text, engajamento integer default 0, importado timestamptz not null default now()
);
alter table public.prof_grupo enable row level security;

create table if not exists public.prof_alias (
  alias text primary key, canonical text not null, criado timestamptz not null default now()
);
alter table public.prof_alias enable row level security;

create table if not exists public.prof_grupo_log (
  id bigint generated always as identity primary key,
  recebido timestamptz not null default now(), payload jsonb, interpretado jsonb
);
alter table public.prof_grupo_log enable row level security;;
