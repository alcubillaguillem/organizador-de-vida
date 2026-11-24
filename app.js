import { clave, desdeClave, sumarDias, ultimosDias, tasaSemanal, tasaDia, esDiario, hechosSemana, racha, mejor } from "./stats.js";
import { emojiDe } from "./emoji.js";

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
      Array.isArray(h.dias) && h.dias.every((d) => fecha.test(d)) &&
      (h.meta === undefined || (Number.isInteger(h.meta) && h.meta >= 1 && h.meta <= 7))) : [];
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
const frecuencia = (h) => (esDiario(h) ? "Cada día" : `${h.meta} ${h.meta === 1 ? "vez" : "veces"} por semana`);

/** Texto bajo el nombre: racha y, en los semanales, el progreso de la semana. */
function detalle(h, hoy) {
  const r = racha(h, hoy);
  if (esDiario(h)) return `Cada día · Racha ${r} ${r === 1 ? "día" : "días"}`;
  const n = hechosSemana(h.dias, hoy);
  const semana = n >= h.meta ? "Semana cumplida ✓" : `${n} de ${h.meta} esta semana`;
  return `${semana} · Racha ${r} ${r === 1 ? "semana" : "semanas"}`;
}

let avisoTimer;
function aviso(texto) {
  const t = $("#aviso");
  t.textContent = texto;
  t.classList.remove("hidden");
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => t.classList.add("hidden"), 2500);
}

function cambiarFrecuencia(h) {
  const r = prompt(`¿Cuántas veces por semana quieres hacer «${h.nombre}»? (1 a 7; 7 = cada día)`, h.meta ?? 7);
  if (r === null) return;
  const n = Number(r);
  if (!Number.isInteger(n) || n < 1 || n > 7) return aviso("Pon un número del 1 al 7.");
  h.meta = n;
  guardar();
}

function pintarLista(hoy) {
  const semana = ultimosDias(7, hoy);
  $("#semana").replaceChildren(el("span"), ...semana.map((k) => el("span", { textContent: LETRAS[desdeClave(k).getDay()] })), el("span"));
  $("#semana").classList.toggle("hidden", !habitos.length);

  $("#lista").replaceChildren(...(habitos.length ? habitos.map((h) => el("li", { className: "item" },
    (() => {
      const b = el("button", { type: "button", className: "name", title: "Cambiar frecuencia", textContent: `${emojiDe(h.nombre)} ${h.nombre}` },
        el("small", { className: !esDiario(h) && hechosSemana(h.dias, hoy) >= h.meta ? "ok" : "", textContent: detalle(h, hoy) }));
      b.addEventListener("click", () => cambiarFrecuencia(h));
      return b;
    })(),
    ...semana.map((k) => {
      const b = el("button", {
        type: "button", className: k === clave(hoy) ? "dot today" : "dot",
        disabled: k < h.creado, title: k, ariaLabel: `${h.nombre}, ${k}`,
      });
      b.setAttribute("aria-pressed", String(h.dias.includes(k)));
      b.addEventListener("click", () => {
        const antes = hechosSemana(h.dias, hoy);
        h.dias = h.dias.includes(k) ? h.dias.filter((d) => d !== k) : [...h.dias, k];
        guardar();
        if (!esDiario(h) && antes < h.meta && hechosSemana(h.dias, hoy) >= h.meta) aviso(`¡${h.nombre}: semana cumplida!`);
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
  const semanales = habitos.filter((h) => !esDiario(h));
  $("#k-sem").textContent = semanales.length
    ? `${semanales.filter((h) => hechosSemana(h.dias, hoy) >= h.meta).length} de ${semanales.length}` : "—";

  // 12 semanas completas de lunes a domingo; los días futuros quedan vacíos.
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7) - 77);
  $("#mapa").replaceChildren(...Array.from({ length: 84 }, (_, i) => {
    const dia = clave(sumarDias(lunes, i));
    const t = dia > k ? null : tasaDia(habitos, dia);
    return el("span", { className: dia > k ? "fut" : t ? `l${Math.ceil(t * 4)}` : "", title: `${dia}: ${pct(t)}` });
  }));

  $("#tabla").replaceChildren(...habitos.map((h) => el("tr", {},
    el("td", {}, `${emojiDe(h.nombre)} ${h.nombre}`, el("small", { textContent: frecuencia(h) })),
    el("td", { textContent: `${racha(h, hoy)} ${esDiario(h) ? "d" : "sem"}` }),
    el("td", { textContent: `${mejor(h)} ${esDiario(h) ? "d" : "sem"}` }),
    el("td", { textContent: pct(tasaSemanal(h, hoy)) }),
  )));
}

function pintar() {
  const hoy = new Date();
  const k = clave(hoy);
  $("#hoy-fecha").textContent = hoy.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const diarios = habitos.filter(esDiario), semanales = habitos.filter((h) => !esDiario(h));
  $("#hoy-habitos").textContent = diarios.length
    ? `${diarios.filter((h) => h.dias.includes(k)).length} de ${diarios.length}` : "Sin hábitos diarios";
  $("#hoy-semanales").textContent = semanales.length
    ? `Objetivos semanales cumplidos: ${semanales.filter((h) => hechosSemana(h.dias, hoy) >= h.meta).length} de ${semanales.length}` : "";
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
    const meta = Number($("#nuevo-meta").value);
    habitos.push({ id: crypto.randomUUID(), nombre, creado: clave(new Date()), dias: [], ...(meta < 7 && { meta }) });
    $("#nuevo-nombre").value = "";
    guardar();
  });
  // Al volver a la app otro día, repinta con la fecha nueva.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pintar(); });
  mostrar("inicio");
  pintar();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
});
