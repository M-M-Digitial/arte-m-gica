-- Marca quem está no grupo (import do DevZapp) e função de chave à prova do nono dígito
alter table public.quiz_leads add column if not exists no_grupo text;

create or replace function public.zap_chave(v text) returns text language sql immutable as $$
  select case
    when length(regexp_replace(coalesce(v,''),'\D','','g')) >= 12
         and left(regexp_replace(coalesce(v,''),'\D','','g'),2) = '55'
      then substr(regexp_replace(coalesce(v,''),'\D','','g'),3,2) || right(regexp_replace(coalesce(v,''),'\D','','g'),8)
    else left(regexp_replace(coalesce(v,''),'\D','','g'),2) || right(regexp_replace(coalesce(v,''),'\D','','g'),8)
  end
$$;

create table if not exists public.quiz_grupo (
  telefone text primary key,
  chave text,
  engajamento integer default 0,
  importado timestamptz not null default now()
);
alter table public.quiz_grupo enable row level security;;
