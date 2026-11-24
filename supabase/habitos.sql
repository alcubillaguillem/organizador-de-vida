-- Organizador de vida: hábitos sincronizados entre dispositivos. Cada usuario solo ve los suyos.
-- Va en el proyecto de Supabase "gastos-erasmus" (mismo login que Gastos).
create table if not exists public.habitos (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre     text not null check (char_length(nombre) between 1 and 60),
  meta       smallint check (meta between 1 and 7),
  creado     date not null,
  dias       date[] not null default '{}' check (cardinality(dias) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habitos_user_idx on public.habitos (user_id);

alter table public.habitos enable row level security;

drop policy if exists "habitos propios" on public.habitos;
create policy "habitos propios" on public.habitos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.habitos from anon;
grant select, insert, update, delete on public.habitos to authenticated;
