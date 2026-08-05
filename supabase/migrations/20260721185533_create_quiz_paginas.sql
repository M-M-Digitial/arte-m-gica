-- Páginas hospedadas (ex.: painel admin) servidas pela Edge Function
create table if not exists public.quiz_paginas (
  nome text primary key,
  html text not null,
  atualizado timestamptz not null default now()
);
alter table public.quiz_paginas enable row level security;;
