// Función "aviso-resumen": manda el aviso "Resumen de la mañana" a tus dispositivos.
// La llama la tarea programada de Claude después de guardar el resumen, con la cabecera x-clave.
// Sin la clave correcta, aviso_resumen_datos no devuelve nada.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const APP = "https://alcubillaguillem.github.io/organizador-de-vida/";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método no permitido", { status: 405 });
  const clave = req.headers.get("x-clave") ?? "";
  if (clave.length < 64) return new Response("no autorizado", { status: 401 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("aviso_resumen_datos", { p_clave: clave });
  if (error) return new Response("no autorizado", { status: 401 });
  if (!data?.publica || !data?.privada) return new Response("faltan las claves VAPID", { status: 500 });
  if (!data.subs?.length) return Response.json({ enviados: 0 });

  webpush.setVapidDetails(APP, data.publica, data.privada);
  const carga = JSON.stringify({ titulo: "Resumen de la mañana", cuerpo: data.cuerpo, url: "./#resumen" });
  let enviados = 0;
  await Promise.all(data.subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga,
        { TTL: 6 * 3600, urgency: "high" });
      enviados++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410: ese dispositivo ya no acepta avisos.
      if (code === 404 || code === 410) await sb.from("avisos_push").delete().eq("endpoint", s.endpoint);
      else console.error("aviso fallido", code);
    }
  }));
  return Response.json({ enviados });
});
