-- Organizador de vida: resumen diario (lo escribe la tarea programada de Claude a las 7:00).
-- La app solo lee el tuyo. Claude lee las tareas con el conector y escribe con una clave secreta
-- (guardada solo aquí, en el esquema privado) llamando a resumen_guardar.

create table if not exists public.resumenes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  fecha      date not null,
  contenido  jsonb not null check (jsonb_typeof(contenido) = 'object' and pg_column_size(contenido) < 60000),
  created_at timestamptz not null default now(),
  primary key (user_id, fecha)
);

alter table public.resumenes enable row level security;
drop policy if exists "resumenes propios" on public.resumenes;
create policy "resumenes propios" on public.resumenes
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.resumenes from anon, authenticated;
grant select on public.resumenes to authenticated;

-- Esquema privado (la API no lo publica): dueño del resumen y clave de Claude.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
create table if not exists privado.resumen_ajustes (
  id      boolean primary key default true check (id),
  user_id uuid not null references auth.users(id) on delete cascade,
  clave   text not null check (char_length(clave) >= 64)
);
-- Tu fila (pon tu id de usuario; la clave se genera sola):
-- insert into privado.resumen_ajustes (user_id, clave)
--   values ('TU_USER_ID', encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;

-- Comprueba la clave sin filtrar cuánto coincide.
create or replace function privado.clave_ok(p_clave text) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from privado.resumen_ajustes
  where extensions.digest(clave, 'sha256') = extensions.digest(coalesce(p_clave, ''), 'sha256');
$$;

-- Guarda (o rehace) el resumen de un día.
create or replace function public.resumen_guardar(p_clave text, p_fecha date, p_contenido jsonb) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := privado.clave_ok(p_clave);
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  insert into public.resumenes (user_id, fecha, contenido) values (uid, p_fecha, p_contenido)
  on conflict (user_id, fecha) do update set contenido = excluded.contenido, created_at = now();
end $$;

revoke all on function privado.clave_ok(text) from public, anon, authenticated;
revoke all on function public.resumen_guardar(text, date, jsonb) from public, anon, authenticated;
grant execute on function public.resumen_guardar(text, date, jsonb) to anon;
