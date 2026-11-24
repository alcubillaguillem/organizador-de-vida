// Categorías de la agenda. Coinciden con los calendarios de Google: el evento se asigna
// por el nombre de su calendario (sin mayúsculas ni tildes). En este orden se muestran.
export const CATEGORIAS = [
  { id: "importante", nombre: "Importante", emoji: "❗" },
  { id: "clases", nombre: "Clases", emoji: "🎓" },
  { id: "deportes", nombre: "Deportes", emoji: "🏋️" },
  { id: "espiritualidad", nombre: "Espiritualidad", emoji: "🙏" },
  { id: "semper", nombre: "Semper", emoji: "⛪" },
  { id: "viajes", nombre: "Viajes", emoji: "✈️" },
  { id: "ocio", nombre: "Ocio", emoji: "🎉" },
];
const OTRA = { id: "otros", nombre: "Otros", emoji: "📅" };

const normalizar = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Categoría de un calendario por su nombre. Si no coincide, "Otros" con el nombre original. */
export function categoriaDe(calendario) {
  const n = normalizar(calendario);
  return CATEGORIAS.find((c) => n.includes(c.id)) ?? (calendario ? { ...OTRA, nombre: calendario } : OTRA);
}

/** Agrupa elementos por categoría, en el orden de CATEGORIAS (los "Otros" al final). */
export function agrupar(items, calendarioDe) {
  const grupos = new Map();
  for (const it of items) {
    const c = categoriaDe(calendarioDe(it));
    if (!grupos.has(c.nombre)) grupos.set(c.nombre, { ...c, items: [] });
    grupos.get(c.nombre).items.push(it);
  }
  const orden = (g) => { const i = CATEGORIAS.findIndex((c) => c.id === g.id); return i < 0 ? 99 : i; };
  return [...grupos.values()].sort((a, b) => orden(a) - orden(b));
}
