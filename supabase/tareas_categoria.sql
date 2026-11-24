-- Organizador de vida: categoría opcional en las tareas (mismas que los calendarios).
alter table public.tareas add column if not exists categoria text;
alter table public.tareas drop constraint if exists tareas_categoria_valida;
alter table public.tareas add constraint tareas_categoria_valida check (categoria is null or categoria in
  ('importante','clases','deportes','espiritualidad','semper','viajes','ocio'));
