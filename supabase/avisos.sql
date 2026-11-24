-- Organizador de vida: avisos push del resumen diario.
-- Cada dispositivo que acepta avisos guarda aquí su suscripción. Solo ves y borras las tuyas.
create table if not exists public.avisos_push (
  endpoint   text primary key check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
alter table public.avisos_push enable row level security;
drop policy if exists "avisos propios" on public.avisos_push;
create policy "avisos propios" on public.avisos_push
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.avisos_push from anon, authenticated;
grant select, insert, update, delete on public.avisos_push to authenticated;

-- Claves VAPID (la privada nunca sale de la base de datos salvo hacia la función aviso-resumen).
alter table privado.resumen_ajustes add column if not exists vapid_publica text;
alter table privado.resumen_ajustes add column if not exists vapid_privada text;
-- update privado.resumen_ajustes set vapid_publica = '...', vapid_privada = '...';

-- Lo que necesita la función aviso-resumen. Solo con la clave correcta y solo para service_role.
create or replace function public.aviso_resumen_datos(p_clave text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := privado.clave_ok(p_clave);
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  return (select jsonb_build_object(
    'publica', a.vapid_publica, 'privada', a.vapid_privada,
    'cuerpo', (select left(coalesce(r.contenido->>'dia', 'Tu resumen de hoy está listo.'), 160)
               from public.resumenes r where r.user_id = uid order by r.fecha desc limit 1),
    'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
                      from public.avisos_push s where s.user_id = uid), '[]'::jsonb))
    from privado.resumen_ajustes a);
end $$;
revoke all on function public.aviso_resumen_datos(text) from public, anon, authenticated;
grant execute on function public.aviso_resumen_datos(text) to service_role;
