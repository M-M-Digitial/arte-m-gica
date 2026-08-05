-- Deduplicação por WhatsApp: sessões novas do mesmo número são apelidadas para a sessão original
create table if not exists public.quiz_alias (
  alias text primary key,
  canonical text not null,
  criado timestamptz not null default now()
);
alter table public.quiz_alias enable row level security;

alter table public.quiz_leads add column if not exists whatsapp_norm text;
update public.quiz_leads
  set whatsapp_norm = right(regexp_replace(whatsapp, '\D', '', 'g'), 11)
  where whatsapp is not null and whatsapp_norm is null;
create index if not exists quiz_leads_zap_idx on public.quiz_leads (whatsapp_norm);;
