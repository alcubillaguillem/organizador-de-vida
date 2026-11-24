// Cálculos del habit tracker. Las fechas se guardan como "AAAA-MM-DD" en hora local.

export const clave = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const desdeClave = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Claves de los últimos n días, del más antiguo a hoy. */
export const ultimosDias = (n, hoy = new Date()) =>
  Array.from({ length: n }, (_, i) => clave(sumarDias(hoy, i - n + 1)));

/** Días seguidos hasta hoy. Si hoy aún no está hecho, cuenta desde ayer. */
export function rachaActual(dias, hoy = new Date()) {
  const hechos = new Set(dias);
  let d = hechos.has(clave(hoy)) ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (hechos.has(clave(d))) { n++; d = sumarDias(d, -1); }
  return n;
}

/** Mejor racha de claves consecutivas separadas por `paso` días (1 = días, 7 = semanas). */
export function mejorRacha(dias, paso = 1) {
  let mejor = 0, actual = 0, previo = null;
  for (const k of [...new Set(dias)].sort()) {
    actual = previo && clave(sumarDias(desdeClave(previo), paso)) === k ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = k;
  }
  return mejor;
}

/**
 * Diario: fracción cumplida de los últimos 7 días, sin contar los anteriores a la creación.
 * Semanal: progreso de esta semana respecto al objetivo (máximo 1).
 */
export function tasaSemanal(habito, hoy = new Date()) {
  if (!esDiario(habito)) return Math.min(1, hechosSemana(habito.dias, hoy) / habito.meta);
  const hechos = new Set(habito.dias);
  const semana = ultimosDias(7, hoy).filter((k) => k >= habito.creado);
  return semana.length ? semana.filter((k) => hechos.has(k)).length / semana.length : 0;
}

/** Fracción de hábitos diarios cumplidos un día, entre los que ya existían. Null si no había ninguno. */
export function tasaDia(habitos, k) {
  const vivos = habitos.filter((h) => esDiario(h) && h.creado <= k);
  return vivos.length ? vivos.filter((h) => h.dias.includes(k)).length / vivos.length : null;
}

// ---------- Hábitos con frecuencia semanal ----------
// meta = veces por semana (1 a 7). 7 o sin meta = hábito diario. Las semanas van de lunes a domingo.

export const esDiario = (h) => !(h.meta < 7);
export const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));

/** Veces cumplidas en la semana (lunes a domingo) que contiene `dia`. */
export function hechosSemana(dias, dia = new Date()) {
  const ini = clave(lunesDe(dia)), fin = clave(sumarDias(lunesDe(dia), 6));
  return new Set(dias.filter((k) => k >= ini && k <= fin)).size;
}

/** Semanas seguidas con el objetivo cumplido. Si esta semana aún no está cumplida, cuenta desde la anterior. */
export function rachaSemanas(h, hoy = new Date()) {
  let lunes = lunesDe(hoy);
  if (hechosSemana(h.dias, lunes) < h.meta) lunes = sumarDias(lunes, -7);
  let n = 0;
  while (hechosSemana(h.dias, lunes) >= h.meta) { n++; lunes = sumarDias(lunes, -7); }
  return n;
}

export function mejorRachaSemanas(h) {
  const porSemana = new Map();
  for (const k of new Set(h.dias)) {
    const l = clave(lunesDe(desdeClave(k)));
    porSemana.set(l, (porSemana.get(l) || 0) + 1);
  }
  const cumplidas = [...porSemana].filter(([, n]) => n >= h.meta).map(([l]) => l);
  return mejorRacha(cumplidas, 7);
}

/** Racha y mejor racha según el tipo de hábito (días o semanas). */
export const racha = (h, hoy = new Date()) => (esDiario(h) ? rachaActual(h.dias, hoy) : rachaSemanas(h, hoy));
export const mejor = (h) => (esDiario(h) ? mejorRacha(h.dias) : mejorRachaSemanas(h));
