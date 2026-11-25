// Convierte la página de iBreviary en texto plano: [{ titulo, parrafos: [[texto, esRubrica], ...] }].
// Nada de HTML sale de aquí: la app lo pinta con textContent.
export const HORAS = ["ufficio_delle_letture", "lodi", "ora_media", "vespri", "compieta"];

const ENT = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", iexcl: "¡", iquest: "¿", laquo: "«", raquo: "»",
  hellip: "…", mdash: "—", ndash: "–", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", middot: "·", ordf: "ª", ordm: "º",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", agrave: "à", egrave: "è", ograve: "ò", ccedil: "ç",
};
const decodificar = (t) => t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== "#") return ENT[e] ?? m;
  const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return n > 31 && n < 0x110000 ? String.fromCodePoint(n) : "";
});
const esRubrica = (tag) => /class="[^"]*\b(rubrica|sezione)\b/i.test(tag) || /style="[^"]*color/i.test(tag);

export function limpiar(html) {
  if (typeof html !== "string") return null;
  const ini = html.indexOf('<div class="inner">');
  if (ini < 0) return null;
  const fin = html.indexOf("</div>", ini);
  const cuerpo = html.slice(ini, fin < 0 ? undefined : fin).replace(/<(h1|script|style)\b[\s\S]*?<\/\1>/gi, "").replace(/<a [\s\S]*?<\/a>/gi, "");
  const parrafos = [];
  for (const bloque of cuerpo.split(/<\/p>/i)) {
    const segs = [], pila = [];
    let nivel = 0;
    for (const trozo of bloque.split(/(<[^>]*>)/)) {
      if (trozo.startsWith("<")) {
        if (/^<br/i.test(trozo)) segs.push(["\n", nivel > 0]);
        else if (/^<(span|p)\b/i.test(trozo)) { const r = esRubrica(trozo); if (trozo[1] !== "p") pila.push(r); if (r) nivel++; }
        else if (/^<\/span/i.test(trozo) && pila.pop()) nivel--;
        continue;
      }
      const t = decodificar(trozo.replace(/\s+/g, " "));
      if (t) segs.push([t, nivel > 0]);
    }
    // Junta los trozos seguidos del mismo tipo y recorta espacios.
    const p = [];
    for (const [t, r] of segs) {
      if (p.length && p[p.length - 1][1] === r) p[p.length - 1][0] += t; else p.push([t, r]);
    }
    for (const s of p) s[0] = s[0].replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
    if (p.length) { p[0][0] = p[0][0].trimStart(); p[p.length - 1][0] = p[p.length - 1][0].trimEnd(); }
    const limpio = p.filter(([t]) => t.trim()).map(([t, r]) => [t.slice(0, 5000), r]);
    if (limpio.length) parrafos.push(limpio);
    if (parrafos.length >= 400) break;
  }
  if (!parrafos.length) return null;
  const primero = parrafos[0];
  const titulo = primero.length === 1 && primero[0][1] ? parrafos.shift()[0][0].trim().slice(0, 80) : "";
  return { titulo, parrafos };
}
