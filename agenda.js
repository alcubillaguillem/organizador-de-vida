// Cálculos de la pestaña Calendario. Semanas de lunes a domingo, fechas "AAAA-MM-DD" en hora local.
import { clave, sumarDias, desdeClave } from "./stats.js";

export const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));

/** Los 42 días (6 semanas) que se ven en la vista de mes. */
export const rejillaMes = (d) => {
  const lunes = lunesDe(new Date(d.getFullYear(), d.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => sumarDias(lunes, i));
};

/** Avanza (paso 1) o retrocede (paso -1) un mes, una semana o un día. */
export function mover(modo, d, paso) {
  if (modo === "dia") return sumarDias(d, paso);
  if (modo === "semana") return sumarDias(d, 7 * paso);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + paso + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + paso, Math.min(d.getDate(), ultimo));
}

/** Eventos de un día: los de todo el día y los que tienen hora, con minutos desde las 00:00 recortados al día. */
export function delDia(eventos, k) {
  const ini = desdeClave(k), fin = sumarDias(ini, 1);
  const todoDia = [], conHora = [];
  for (const e of eventos) {
    if (e.dia) {
      const hasta = e.diaFin && e.diaFin > e.dia ? e.diaFin : clave(sumarDias(desdeClave(e.dia), 1));
      if (e.dia <= k && k < hasta) todoDia.push(e);
      continue;
    }
    const s = new Date(e.inicio), f = new Date(e.fin);
    if (!(s < fin && f > ini)) continue;
    const min = (t) => Math.round((Math.min(Math.max(t, ini), fin) - ini) / 60000);
    conHora.push({ ...e, desde: min(s), hasta: Math.max(min(f), min(s) + 15) });
  }
  conHora.sort((a, b) => a.desde - b.desde || b.hasta - a.hasta);
  return { todoDia, conHora: carriles(conHora) };
}

/** Reparte los eventos que se solapan en columnas: añade `col` y `cols` a cada uno. */
export function carriles(items) {
  let grupo = [], finGrupo = -1;
  const cerrar = () => { const n = Math.max(0, ...grupo.map((e) => e.col + 1)); for (const e of grupo) e.cols = n; grupo = []; };
  for (const e of items) {
    if (e.desde >= finGrupo) cerrar();
    const ocupadas = new Set(grupo.filter((o) => o.hasta > e.desde).map((o) => o.col));
    e.col = 0;
    while (ocupadas.has(e.col)) e.col++;
    grupo.push(e);
    finGrupo = Math.max(finGrupo, e.hasta);
  }
  cerrar();
  return items;
}
