-- Organizador de vida: tareas del día. Cada usuario solo ve las suyas.
create table if not exists public.tareas (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 120),
  fecha      date not null,
  hecha      boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tareas_user_fecha_idx on public.tareas (user_id, fecha);

alter table public.tareas enable row level security;

drop policy if exists "tareas propias" on public.tareas;
create policy "tareas propias" on public.tareas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.tareas from anon;
grant select, insert, update, delete on public.tareas to authenticated;
