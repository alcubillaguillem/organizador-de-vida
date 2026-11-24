// Resumen diario (lo escribe Claude cada mañana). Valida lo leído y devuelve solo campos conocidos, o null.
const txt = (t, max) => (typeof t === "string" && t.trim() ? t.trim().slice(0, max) : "");
const enlace = (u) => (typeof u === "string" && /^https:\/\/[^\s"<>]+$/.test(u) && u.length <= 300 ? u : "");

export function limpiarResumen(c) {
  if (!c || typeof c !== "object") return null;
  const correos = (Array.isArray(c.correos) ? c.correos : []).slice(0, 40)
    .map((m) => ({ de: txt(m?.de, 80), asunto: txt(m?.asunto, 140), resumen: txt(m?.resumen, 400), importante: m?.importante === true }))
    .filter((m) => m.asunto || m.resumen);
  const e = c.evangelio ?? {};
  const evangelio = { cita: txt(e.cita, 80), texto: txt(e.texto, 4000), reflexion: txt(e.reflexion, 800), enlace: enlace(e.enlace) };
  const dia = txt(c.dia, 800);
  if (!dia && !correos.length && !evangelio.texto) return null;
  return { dia, correos, evangelio: evangelio.texto ? evangelio : null };
}
