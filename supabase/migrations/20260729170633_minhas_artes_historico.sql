create table public.minhas_artes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tema_nome text not null,
  tema_colors jsonb,
  molde_name text not null,
  molde_template_url text,
  nome text not null,
  idade text,
  frase text,
  cor_dominante text,
  fonte_estilo text,
  desenho_estilo text,
  densidade_visual text,
  qualidade text,
  image_url text not null,
  mockup_url text,
  created_at timestamptz not null default now()
);

create index minhas_artes_user_created_idx on public.minhas_artes (user_id, created_at desc);

alter table public.minhas_artes enable row level security;

create policy "donas veem suas artes"
  on public.minhas_artes for select
  using (auth.uid() = user_id);

create policy "donas salvam suas artes"
  on public.minhas_artes for insert
  with check (auth.uid() = user_id);

create policy "donas atualizam suas artes"
  on public.minhas_artes for update
  using (auth.uid() = user_id);

create policy "donas excluem suas artes"
  on public.minhas_artes for delete
  using (auth.uid() = user_id);;
