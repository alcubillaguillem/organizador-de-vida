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

export function mejorRacha(dias) {
  let mejor = 0, actual = 0, previo = null;
  for (const k of [...new Set(dias)].sort()) {
    actual = previo && clave(sumarDias(desdeClave(previo), 1)) === k ? actual + 1 : 1;
    mejor = Math.max(mejor, actual);
    previo = k;
  }
  return mejor;
}

/** Fracción cumplida de los últimos 7 días, sin contar los anteriores a la creación. */
export function tasaSemanal(habito, hoy = new Date()) {
  const hechos = new Set(habito.dias);
  const semana = ultimosDias(7, hoy).filter((k) => k >= habito.creado);
  return semana.length ? semana.filter((k) => hechos.has(k)).length / semana.length : 0;
}

/** Fracción de hábitos cumplidos un día, entre los que ya existían ese día. Null si no había ninguno. */
export function tasaDia(habitos, k) {
  const vivos = habitos.filter((h) => h.creado <= k);
  return vivos.length ? vivos.filter((h) => h.dias.includes(k)).length / vivos.length : null;
}
