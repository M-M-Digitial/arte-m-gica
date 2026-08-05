create table if not exists public.alice_artes (
  id uuid primary key default gen_random_uuid(),
  tema_slug text not null,
  molde_name text not null,
  image_url text not null,
  largura int,
  altura int,
  created_at timestamptz not null default now(),
  unique (tema_slug, molde_name)
);

alter table public.alice_artes enable row level security;

drop policy if exists "leitura para autenticadas" on public.alice_artes;
create policy "leitura para autenticadas"
  on public.alice_artes for select
  to authenticated
  using (true);;
