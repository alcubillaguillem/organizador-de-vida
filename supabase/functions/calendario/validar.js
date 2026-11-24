// Valida lo que la app pide a la función de calendario. Devuelve solo los campos permitidos, o null.
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const DIA = 86400000;
const esFecha = (k) => typeof k === "string" && FECHA.test(k) && !isNaN(Date.parse(k));
const esInstante = (t) => typeof t === "string" && t.length <= 40 && !isNaN(Date.parse(t));
const texto = (t, max) => typeof t === "string" && t.trim().length > 0 && t.length <= max;
const idCal = (c) => typeof c === "string" && c.length <= 200 && /^[\w.@+-]+$/.test(c);

/** Fechas de un evento: de todo el día (dia, diaFin exclusivo) o con hora (inicio, fin). */
function cuando(p) {
  if (p.dia !== undefined) {
    if (!esFecha(p.dia) || !esFecha(p.diaFin)) return null;
    const n = (Date.parse(p.diaFin) - Date.parse(p.dia)) / DIA;
    return n >= 1 && n <= 60 ? { dia: p.dia, diaFin: p.diaFin } : null;
  }
  if (!esInstante(p.inicio) || !esInstante(p.fin)) return null;
  const n = (Date.parse(p.fin) - Date.parse(p.inicio)) / DIA;
  return n > 0 && n <= 7 ? { inicio: p.inicio, fin: p.fin } : null;
}

export function validar(p) {
  if (!p || typeof p !== "object") return null;
  switch (p.accion) {
    case "calendarios":
      return { accion: p.accion };
    case "listar": {
      if (!esInstante(p.desde) || !esInstante(p.hasta)) return null;
      const n = (Date.parse(p.hasta) - Date.parse(p.desde)) / DIA;
      return n > 0 && n <= 45 ? { accion: p.accion, desde: p.desde, hasta: p.hasta } : null;
    }
    case "crear": case "editar": {
      const c = cuando(p);
      if (!c || !idCal(p.cal) || !texto(p.titulo, 200)) return null;
      const r = { accion: p.accion, cal: p.cal, titulo: p.titulo.trim(), ...c };
      if (p.accion === "crear") return r;
      return texto(p.id, 300) && (esFecha(p.original) || esInstante(p.original)) ? { ...r, id: p.id, original: p.original } : null;
    }
    case "borrar":
      return idCal(p.cal) && texto(p.id, 300) && (esFecha(p.original) || esInstante(p.original))
        ? { accion: p.accion, cal: p.cal, id: p.id, original: p.original } : null;
    default:
      return null;
  }
}
