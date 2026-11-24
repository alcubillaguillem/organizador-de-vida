import { clave, desdeClave, sumarDias, ultimosDias, rachaActual, mejorRacha, tasaSemanal, tasaDia } from "./stats.js";

// Datos: solo en este navegador (localStorage). La sincronización llegará con Supabase.
const STORE = "organizador.habitos.v1";
const $ = (s) => document.querySelector(s);

function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORE) || "[]");
    const fecha = /^\d{4}-\d{2}-\d{2}$/;
    // Valida lo leído: descarta cualquier cosa que no tenga la forma esperada.
    return Array.isArray(datos) ? datos.filter((h) =>
      typeof h?.id === "string" && typeof h.nombre === "string" && fecha.test(h.creado) &&
      Array.isArray(h.dias) && h.dias.every((d) => fecha.test(d))) : [];
  } catch { return []; }
}

let habitos = cargar();
const guardar = () => { localStorage.setItem(STORE, JSON.stringify(habitos)); pintar(); };

/** Crea un elemento. El texto siempre va por textContent, nunca como HTML. */
function el(tag, props = {}, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...hijos);
  return e;
}

const icono = (d) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "ic");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  svg.append(p);
  return svg;
};

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)} %`);
const media = (dias) => {
  const tasas = dias.map((k) => tasaDia(habitos, k)).filter((x) => x != null);
  return tasas.length ? tasas.reduce((a, b) => a + b, 0) / tasas.length : null;
};
const LETRAS = ["D", "L", "M", "X", "J", "V", "S"];

function pintarLista(hoy) {
  const semana = ultimosDias(7, hoy);
  $("#semana").replaceChildren(el("span"), ...semana.map((k) => el("span", { textContent: LETRAS[desdeClave(k).getDay()] })), el("span"));
  $("#semana").classList.toggle("hidden", !habitos.length);

  $("#lista").replaceChildren(...(habitos.length ? habitos.map((h) => el("li", { className: "item" },
    el("span", { className: "name", textContent: h.nombre }, el("small", { textContent: `Racha ${rachaActual(h.dias, hoy)}` })),
    ...semana.map((k) => {
      const b = el("button", {
        type: "button", className: k === clave(hoy) ? "dot today" : "dot",
        disabled: k < h.creado, title: k, ariaLabel: `${h.nombre}, ${k}`,
      });
      b.setAttribute("aria-pressed", String(h.dias.includes(k)));
      b.addEventListener("click", () => {
        h.dias = h.dias.includes(k) ? h.dias.filter((d) => d !== k) : [...h.dias, k];
        guardar();
      });
      return b;
    }),
    (() => {
      const b = el("button", { type: "button", className: "del", ariaLabel: `Borrar ${h.nombre}` }, icono("M6 6l12 12M18 6 6 18"));
      b.addEventListener("click", () => {
        if (confirm(`¿Borrar «${h.nombre}» y todo su historial?`)) { habitos = habitos.filter((x) => x !== h); guardar(); }
      });
      return b;
    })(),
  )) : [el("li", { className: "empty", textContent: "Añade tu primer hábito." })]));
}

function pintarDashboard(hoy) {
  const k = clave(hoy);
  $("#k-hoy").textContent = pct(tasaDia(habitos, k));
  $("#k-semana").textContent = pct(media(ultimosDias(7, hoy)));
  $("#k-mes").textContent = pct(media(ultimosDias(30, hoy)));

  // 12 semanas completas de lunes a domingo; los días futuros quedan vacíos.
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7) - 77);
  $("#mapa").replaceChildren(...Array.from({ length: 84 }, (_, i) => {
    const dia = clave(sumarDias(lunes, i));
    const t = dia > k ? null : tasaDia(habitos, dia);
    return el("span", { className: dia > k ? "fut" : t ? `l${Math.ceil(t * 4)}` : "", title: `${dia}: ${pct(t)}` });
  }));

  $("#tabla").replaceChildren(...habitos.map((h) => el("tr", {},
    el("td", { textContent: h.nombre }),
    el("td", { textContent: rachaActual(h.dias, hoy) }),
    el("td", { textContent: mejorRacha(h.dias) }),
    el("td", { textContent: pct(tasaSemanal(h, hoy)) }),
  )));
}

function pintar() {
  const hoy = new Date();
  const k = clave(hoy);
  $("#hoy-fecha").textContent = hoy.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  $("#hoy-habitos").textContent = habitos.length
    ? `${habitos.filter((h) => h.dias.includes(k)).length} de ${habitos.length}` : "Sin hábitos";
  pintarLista(hoy);
  pintarDashboard(hoy);
}

function mostrar(vista) {
  for (const v of document.querySelectorAll(".view")) v.classList.toggle("hidden", v.id !== `view-${vista}`);
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === vista) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => mostrar(b.dataset.view));
  $("#nuevo").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = $("#nuevo-nombre").value.trim().slice(0, 60);
    if (!nombre) return;
    habitos.push({ id: crypto.randomUUID(), nombre, creado: clave(new Date()), dias: [] });
    $("#nuevo-nombre").value = "";
    guardar();
  });
  // Al volver a la app otro día, repinta con la fecha nueva.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pintar(); });
  mostrar("inicio");
  pintar();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
});
