// Función "liturgia": trae una hora de la Liturgia de las Horas de iBreviary (español) y la devuelve
// como texto plano para que la app la pinte con su estilo. Solo responde a su dueño (CALENDARIO_USER_ID).
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { HORAS, limpiar } from "./limpiar.js";

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

  const hora = (await req.json().catch(() => null))?.hora;
  if (!HORAS.includes(hora)) return json({ error: "petición no válida" }, 400);
  try {
    const res = await fetch(`https://www.ibreviary.com/m2/breviario.php?s=${hora}&lang=es`, { signal: AbortSignal.timeout(10000) });
    const html = res.ok ? await res.text() : "";
    const r = html.length < 500000 ? limpiar(html) : null;
    return r ? json(r) : json({ error: "iBreviary no ha devuelto el texto" }, 502);
  } catch {
    return json({ error: "iBreviary no responde" }, 502);
  }
});
