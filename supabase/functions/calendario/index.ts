// Función "calendario" (slug quick-handler): puente entre la app y tu Google Calendar.
// Solo responde a su dueño (CALENDARIO_USER_ID). Reenvía la petición, ya validada, a tu Apps Script
// (GOOGLE_SCRIPT_URL) junto con la clave secreta (GOOGLE_SCRIPT_CLAVE), que nunca llega al navegador.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { validar } from "./validar.js";

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

  const p = validar(await req.json().catch(() => null));
  if (!p) return json({ error: "petición no válida" }, 400);

  const url = Deno.env.get("GOOGLE_SCRIPT_URL") ?? "", clave = Deno.env.get("GOOGLE_SCRIPT_CLAVE") ?? "";
  if (!url.startsWith("https://script.google.com/macros/s/") || clave.length < 32) {
    return json({ error: "calendario no configurado" }, 500);
  }
  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify({ ...p, clave }), redirect: "follow" });
    const r = await res.json();
    return json(r, r?.error ? 502 : 200);
  } catch {
    return json({ error: "Google no responde" }, 502);
  }
});
