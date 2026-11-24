// Emoji automático según el nombre del hábito. Se busca la primera raíz que aparezca en el nombre
// (sin mayúsculas ni tildes). Las más concretas van antes que las generales.
const MAPA = [
  ["rosario", "📿"], ["misa", "⛪"], ["confes", "🙏"], ["rez", "🙏"], ["orac", "🙏"], ["evangel", "✝️"], ["biblia", "📖"], ["adorac", "🕯️"],
  ["gimnas", "🏋️"], ["gym", "🏋️"], ["pesas", "🏋️"], ["bjj", "🥋"], ["jiu", "🥋"], ["judo", "🥋"], ["karate", "🥋"],
  ["correr", "🏃"], ["running", "🏃"], ["andar", "🚶"], ["caminar", "🚶"], ["pasos", "🚶"], ["bici", "🚴"], ["nadar", "🏊"], ["natac", "🏊"],
  ["yoga", "🧘"], ["estirar", "🤸"], ["estiramiento", "🤸"], ["medit", "🧘"], ["futbol", "⚽"], ["padel", "🎾"], ["tenis", "🎾"], ["deporte", "🏅"],
  ["leer", "📚"], ["lectura", "📚"], ["libro", "📚"], ["estudi", "📝"], ["universidad", "🎓"], ["clase", "🎓"], ["ingles", "🇬🇧"], ["idioma", "🗣️"],
  ["programa", "💻"], ["codigo", "💻"], ["escribir", "✍️"], ["diario", "📓"], ["journal", "📓"],
  ["agua", "💧"], ["beber", "💧"], ["fruta", "🍎"], ["verdura", "🥦"], ["comer", "🍽️"], ["cocinar", "🍳"], ["dieta", "🥗"], ["proteina", "🥩"],
  ["azucar", "🍬"], ["alcohol", "🍺"], ["fumar", "🚭"], ["dormir", "😴"], ["sueño", "😴"], ["madrugar", "⏰"], ["levantar", "⏰"],
  ["movil", "📵"], ["pantalla", "📵"], ["redes", "📵"], ["ducha", "🚿"], ["dientes", "🪥"], ["skincare", "🧴"], ["crema", "🧴"],
  ["limpiar", "🧹"], ["ordenar", "🧹"], ["cama", "🛏️"], ["ahorr", "💰"], ["gasto", "💰"], ["dinero", "💰"],
  ["llamar", "📞"], ["familia", "👨‍👩‍👧"], ["amigo", "🤝"], ["catequ", "⛪"], ["musica", "🎵"], ["guitarra", "🎸"], ["piano", "🎹"],
  ["dibujar", "🎨"], ["pintar", "🎨"], ["planta", "🪴"], ["regar", "🪴"], ["perro", "🐕"], ["vitamina", "💊"], ["pastilla", "💊"],
];

const normalizar = (t) => t.toLowerCase().replace(/ñ/g, "\u0000").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0000/g, "ñ");

export function emojiDe(nombre) {
  const n = normalizar(nombre);
  return MAPA.find(([raiz]) => n.includes(raiz))?.[1] ?? "⭐";
}
