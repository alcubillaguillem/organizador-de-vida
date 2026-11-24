// Función "calendario": devuelve los eventos de Google Calendar de un rango de fechas.
// Lee los enlaces iCal secretos (CALENDARIO_ICAL_URL, separados por espacios) y solo responde a su dueño (CALENDARIO_USER_ID).
import ICAL from "npm:ical.js@2.1.0";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { eventosEntre, ordenar } from "./eventos.js";

const cors = {
  "Access-Control-Allow-Origin": "https://alcubillaguillem.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await sb.auth.getUser(token);
  if (!data.user || data.user.id !== Deno.env.get("CALENDARIO_USER_ID")) return json({ error: "no autorizado" }, 403);

  const { desde, hasta } = await req.json().catch(() => ({}));
  const ini = new Date(desde), fin = new Date(hasta);
  const dias = (fin.getTime() - ini.getTime()) / 86400000;
  if (!(dias > 0 && dias <= 8)) return json({ error: "rango no válido" }, 400);

  const urls = (Deno.env.get("CALENDARIO_ICAL_URL") ?? "").split(/[\s,]+/).filter(Boolean);
  if (!urls.length || !urls.every((u) => u.startsWith("https://calendar.google.com/"))) {
    return json({ error: "calendario no configurado" }, 500);
  }
  // Si un calendario falla, se muestran los demás.
  const listas = await Promise.all(urls.slice(0, 20).map(async (u) => {
    try {
      const res = await fetch(u);
      return res.ok ? eventosEntre(ICAL, await res.text(), ini, fin) : [];
    } catch { return []; }
  }));
  return json({ eventos: ordenar(listas.flat()) });
});
