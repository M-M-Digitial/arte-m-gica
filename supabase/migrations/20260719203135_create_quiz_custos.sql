-- Gasto de tráfego informado pelo admin, por campanha/criativo (utm_campaign)
create table if not exists public.quiz_custos (
  campanha text primary key,
  gasto numeric not null default 0,
  atualizado timestamptz not null default now()
);
alter table public.quiz_custos enable row level security;;
