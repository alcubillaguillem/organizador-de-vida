import { clave, desdeClave, sumarDias, ultimosDias, tasaSemanal, tasaDia, esDiario, hechosSemana, racha, mejor } from "./stats.js";
import { emojiDe } from "./emoji.js";
import { agrupar, CATEGORIAS, categoriaDe } from "./categorias.js";
import { iniciarCalendario } from "./calendario.js";
import { limpiarResumen } from "./resumen.js";

// Datos: copia en este navegador (localStorage) y, con sesión iniciada, sincronizados en Supabase.
const STORE = "organizador.habitos.v1";
const $ = (s) => document.querySelector(s);
const cfg = window.APP_CONFIG || {};
const sb = cfg.supabaseUrl && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
let sesion = null;

// Valida cualquier dato leído (navegador o servidor): descarta lo que no tenga la forma esperada.
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const valido = (h) =>
  typeof h?.id === "string" && typeof h.nombre === "string" && FECHA.test(h.creado) &&
  Array.isArray(h.dias) && h.dias.every((d) => FECHA.test(d)) &&
  (h.meta === undefined || (Number.isInteger(h.meta) && h.meta >= 1 && h.meta <= 7));

const STORE_T = "organizador.tareas.v1";
const tareaValida = (t) =>
  typeof t?.id === "string" && typeof t.texto === "string" && t.texto.length <= 120 &&
  FECHA.test(t.fecha) && typeof t.hecha === "boolean" &&
  (t.categoria == null || CATEGORIAS.some((c) => c.id === t.categoria));

function leer(store, ok) {
  try {
    const datos = JSON.parse(localStorage.getItem(store) || "[]");
    return Array.isArray(datos) ? datos.filter(ok) : [];
  } catch { return []; }
}

let habitos = leer(STORE, valido);
let tareas = leer(STORE_T, tareaValida);
const guardarLocal = () => {
  localStorage.setItem(STORE, JSON.stringify(habitos));
  localStorage.setItem(STORE_T, JSON.stringify(tareas));
};

const ahora = () => new Date().toISOString();
const aFila = (h) => ({ id: h.id, nombre: h.nombre, meta: h.meta ?? null, creado: h.creado, dias: h.dias, updated_at: ahora() });
// meta null (o 7) en el servidor = hábito diario: en local no lleva meta.
const deFila = (f) => ({ id: f.id, nombre: f.nombre, creado: f.creado, dias: f.dias ?? [], ...(Number.isInteger(f.meta) && f.meta < 7 && { meta: f.meta }) });
const aFilaT = (t) => ({ id: t.id, texto: t.texto, fecha: t.fecha, hecha: t.hecha, categoria: t.categoria ?? null, updated_at: ahora() });
const fallo = (error) => { if (error) aviso("No se pudo sincronizar. Revisa la conexión."); };

/** Guarda en local y, si hay sesión, sube (o borra) esa fila en Supabase. */
async function sincronizar(tabla, fila, borrado) {
  guardarLocal();
  pintar();
  if (!sesion) return;
  const q = sb.from(tabla);
  const { error } = borrado ? await q.delete().eq("id", fila.id) : await q.upsert(fila);
  fallo(error);
}
const guardar = (h, borrado = false) => sincronizar("habitos", aFila(h), borrado);
const guardarTarea = (t, borrado = false) => sincronizar("tareas", aFilaT(t), borrado);

/** Trae una tabla del servidor. La primera vez, sube lo que ya hubiera en este navegador. */
async function traer(tabla, columnas, locales, aServidor) {
  const { data, error } = await sb.from(tabla).select(columnas).order("created_at");
  if (error) { fallo(error); return null; }
  if (!data.length && locales.length) { fallo((await sb.from(tabla).upsert(locales.map(aServidor))).error); return null; }
  return data;
}

async function bajar() {
  const [h, t] = await Promise.all([
    traer("habitos", "id,nombre,meta,creado,dias", habitos, aFila),
    traer("tareas", "id,texto,fecha,hecha,categoria", tareas, aFilaT),
  ]);
  if (h) habitos = h.map(deFila).filter(valido);
  if (t) tareas = t.filter(tareaValida);
  guardarLocal();
  pintar();
}

function pintarSesion() {
  const conLogin = !!sb && !sesion;
  $("#login").classList.toggle("hidden", !conLogin);
  $(".shell").classList.toggle("hidden", conLogin);
  $("#cuenta").textContent = sesion ? `Sincronizado: ${sesion.user.email}` : "Modo local (solo este navegador)";
  $("#salir").classList.toggle("hidden", !sesion);
  pintarAvisos().catch(() => {});
}

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

const SVG = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const CHECK = "m5 12.5 4.5 4.5L19 7.5";

/** Marca o desmarca un día de un hábito. */
function alternar(h, k, hoy) {
  const antes = hechosSemana(h.dias, hoy);
  h.dias = h.dias.includes(k) ? h.dias.filter((d) => d !== k) : [...h.dias, k];
  guardar(h);
  if (!esDiario(h) && antes < h.meta && hechosSemana(h.dias, hoy) >= h.meta) aviso(`¡${h.nombre}: semana cumplida!`);
}

/** Crea (h = null) o edita un hábito desde la hoja. */
function guardarHabito(h, nombre, meta) {
  if (!h) {
    h = { id: crypto.randomUUID(), nombre, creado: clave(new Date()), dias: [] };
    habitos.push(h);
  }
  h.nombre = nombre;
  if (meta < 7) h.meta = meta; else delete h.meta;
  guardar(h);
}
function borrarHabito(h) {
  habitos = habitos.filter((x) => x !== h);
  guardar(h, true);
}

function pintarAnillo(hechos, total) {
  const f = total ? hechos / total : 0;
  const r = 15.9155; // circunferencia 100
  const arco = svg("circle", { cx: 18, cy: 18, r, class: "an-arco", "stroke-dasharray": `${f * 100} 100`, pathLength: 100 });
  const s = svg("svg", { viewBox: "0 0 36 36", "aria-hidden": "true" });
  s.append(svg("circle", { cx: 18, cy: 18, r, class: "an-fondo" }), arco);
  $("#hab-anillo").replaceChildren(s, el("span", { textContent: total ? `${hechos}/${total}` : "—" }));
  $("#hab-anillo").classList.toggle("lleno", total > 0 && hechos === total);
  $("#hab-anillo").setAttribute("aria-label", `${hechos} de ${total} hábitos hechos hoy`);
}

function pintarLista(hoy) {
  const k = clave(hoy), previos = ultimosDias(7, hoy).slice(0, 6);
  const hechos = habitos.filter((h) => h.dias.includes(k)).length;
  pintarAnillo(hechos, habitos.length);
  $("#hab-sub").textContent = !habitos.length ? "Toca + para añadir tu primer hábito"
    : hechos === habitos.length ? "¡Todo hecho hoy!" : `Te ${habitos.length - hechos === 1 ? "queda" : "quedan"} ${habitos.length - hechos} para hoy`;

  $("#lista").replaceChildren(...(habitos.length ? habitos.map((h) => {
    const hecho = h.dias.includes(k);
    const info = el("button", { type: "button", className: "hab-info", ariaLabel: `Editar ${h.nombre}` },
      el("span", { className: "hab-emoji", textContent: emojiDe(h.nombre) }),
      el("span", { className: "hab-txt" },
        el("strong", { textContent: h.nombre }),
        el("small", { className: !esDiario(h) && hechosSemana(h.dias, hoy) >= h.meta ? "ok" : "", textContent: detalle(h, hoy) })));
    info.addEventListener("click", () => calendario.abrirHoja({ tipo: "habito", habito: h }));
    const dias = el("div", { className: "hab-dias" }, ...previos.map((d) => {
      const b = el("button", { type: "button", textContent: LETRAS[desdeClave(d).getDay()], disabled: d < h.creado, ariaLabel: `${h.nombre}, ${fechaCorta(d)}` });
      b.setAttribute("aria-pressed", String(h.dias.includes(d)));
      b.addEventListener("click", () => alternar(h, d, hoy));
      return b;
    }));
    const check = el("button", { type: "button", className: "hab-check", ariaLabel: `${h.nombre}: hecho hoy` });
    check.append(icono(CHECK));
    check.setAttribute("aria-pressed", String(hecho));
    check.addEventListener("click", () => { alternar(h, k, hoy); requestAnimationFrame(() => animarCheck(h.id)); });
    const li = el("li", { className: hecho ? "hab-fila hecho" : "hab-fila" }, info, dias, check);
    li.dataset.id = h.id;
    return li;
  }) : [el("li", { className: "empty", textContent: "Aún no tienes hábitos." })]));
}
const animarCheck = (id) => {
  const b = document.querySelector(`#lista [data-id="${CSS.escape(id)}"] .hab-check`);
  if (!b || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  b.classList.remove("pop");
  void b.offsetWidth;
  b.classList.add("pop");
};

/** Barras de los últimos 30 días: % de hábitos diarios cumplidos. Tocar una barra muestra su dato. */
function pintarGrafico(hoy) {
  const dias = ultimosDias(30, hoy);
  const info = $("#graf-info");
  const tasas = dias.map((k) => tasaDia(habitos, k));
  const conDato = tasas.filter((t) => t != null);
  const resumen = conDato.length ? `Media: ${pct(conDato.reduce((a, b) => a + b, 0) / conDato.length)}` : "Sin datos todavía";
  info.textContent = resumen;
  const barras = dias.map((k, i) => {
    const t = tasas[i];
    const b = el("button", { type: "button", className: t == null ? "bar vacia" : "bar", ariaLabel: `${fechaCorta(k)}: ${pct(t)}` });
    b.style.setProperty("--h", t == null ? "0" : String(Math.max(t, 0.03)));
    const ver = () => {
      for (const x of $("#grafico .barras-g").children) x.classList.toggle("sel", x === b);
      info.textContent = `${fechaCorta(k)} · ${t == null ? "sin hábitos" : pct(t)}`;
    };
    b.addEventListener("pointerenter", ver);
    b.addEventListener("click", ver);
    b.addEventListener("focus", ver);
    return b;
  });
  const zona = el("div", { className: "barras-g" }, ...barras);
  zona.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    for (const x of zona.children) x.classList.remove("sel");
    info.textContent = resumen;
  });
  $("#grafico").replaceChildren(
    el("div", { className: "g-ejes", ariaHidden: "true" }, ...["100 %", "50 %", "0 %"].map((t) => el("span", { textContent: t }))),
    el("div", { className: "g-area" },
      el("div", { className: "g-rejilla", ariaHidden: "true" }, el("i"), el("i"), el("i")),
      zona,
      el("div", { className: "g-fechas", ariaHidden: "true" },
        ...[dias[0], dias[15]].map((d) => el("span", { textContent: desdeClave(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) })), el("span", { textContent: "Hoy" }))));
}

function pintarDashboard(hoy) {
  const k = clave(hoy);
  $("#k-hoy").textContent = pct(tasaDia(habitos, k));
  $("#k-semana").textContent = pct(media(ultimosDias(7, hoy)));
  $("#k-mes").textContent = pct(media(ultimosDias(30, hoy)));
  const semanales = habitos.filter((h) => !esDiario(h));
  $("#k-sem").textContent = semanales.length
    ? `${semanales.filter((h) => hechosSemana(h.dias, hoy) >= h.meta).length} de ${semanales.length}` : "—";
  pintarGrafico(hoy);

  // 12 semanas completas de lunes a domingo; los días futuros quedan vacíos.
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7) - 77);
  $("#mapa").replaceChildren(...Array.from({ length: 84 }, (_, i) => {
    const dia = clave(sumarDias(lunes, i));
    const t = dia > k ? null : tasaDia(habitos, dia);
    return el("span", { className: dia > k ? "fut" : t ? `l${Math.ceil(t * 4)}` : "", title: `${dia}: ${pct(t)}` });
  }));

  $("#tabla").replaceChildren(...habitos.map((h) => {
    const u = esDiario(h) ? "d" : "sem", t = tasaSemanal(h, hoy);
    const barra = el("div", { className: "r-barra", ariaHidden: "true" }, el("i"));
    barra.firstChild.style.setProperty("--p", String(t));
    return el("li", {},
      el("div", { className: "r-fila" },
        el("span", { className: "r-nombre", textContent: `${emojiDe(h.nombre)} ${h.nombre}` }),
        el("span", { className: "r-num", textContent: `🔥 ${racha(h, hoy)} ${u}` })),
      barra,
      el("div", { className: "r-pie" },
        el("span", { textContent: `${frecuencia(h)} · esta semana ${pct(t)}` }),
        el("span", { textContent: `Mejor: ${mejor(h)} ${u}` })));
  }));
}

// Google Calendar, a través de la función "calendario" de Supabase (slug quick-handler) y tu Apps Script.
const google = (body) => sb.functions.invoke("quick-handler", { body });
const eventoValido = (e) =>
  typeof e?.titulo === "string" && (e.calendario === undefined || typeof e.calendario === "string") &&
  (e.id === undefined || typeof e.id === "string") && (e.cal === undefined || typeof e.cal === "string") &&
  (e.dia ? FECHA.test(e.dia) && (e.diaFin === undefined || FECHA.test(e.diaFin))
    : !isNaN(Date.parse(e.inicio)) && !isNaN(Date.parse(e.fin)));

// Eventos de hoy para Inicio. Solo en memoria.
let eventos = [];
async function traerEventos() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const { data, error } = await google({ accion: "listar", desde: desde.toISOString(), hasta: sumarDias(desde, 1).toISOString() });
  eventos = !error && Array.isArray(data?.eventos) ? data.eventos.filter(eventoValido) : [];
  pintar();
}

// Resumen de la mañana (lo escribe Claude a las 7:00). Solo en memoria; todo se pinta con textContent.
async function traerResumen() {
  const { data, error } = await sb.from("resumenes").select("fecha,contenido,created_at").order("fecha", { ascending: false }).limit(1);
  const f = !error && data?.[0];
  const r = f && limpiarResumen(f.contenido);
  if (!r) return;
  $("#resumen-hora").textContent = `${f.fecha === clave(new Date()) ? "Hoy" : fechaCorta(f.fecha)} · ${hora(f.created_at)}`;
  const importantes = r.correos.filter((m) => m.importante).length;
  const caja = (vista, icono, titulo, detalle) => {
    const b = el("button", { type: "button", className: "caja" },
      el("span", { className: "caja-ic", textContent: icono }), el("strong", { textContent: titulo }), el("small", { textContent: detalle }));
    b.addEventListener("click", () => mostrar(vista));
    return b;
  };
  $("#resumen-cuerpo").replaceChildren(
    r.dia ? el("p", { className: "resumen-dia", textContent: r.dia }) : "",
    el("div", { className: "cajas" },
      caja("correos", "✉️", "Correos", `${r.correos.length} nuevos${importantes ? ` · ${importantes} importantes` : ""}`),
      r.evangelio ? caja("evangelio", "✝️", "Evangelio del día", r.evangelio.cita) : ""));
  $("#correos-lista").replaceChildren(...(r.correos.length ? r.correos.map((m) => el("li", { className: m.importante ? "correo importante" : "correo" },
    el("div", { className: "correo-cab" }, el("strong", { textContent: m.asunto || "(sin asunto)" }), el("small", { textContent: m.de })),
    el("p", { textContent: m.resumen }))) : [el("li", { className: "empty", textContent: "Nada nuevo." })]));
  const ev = r.evangelio;
  $("#ev-cita").textContent = ev?.cita ?? "";
  $("#ev-texto").textContent = ev?.texto ?? "Hoy no hay Evangelio en el resumen.";
  $("#ev-reflexion").textContent = ev?.reflexion ?? "";
  $("#ev-enlace").classList.toggle("hidden", !ev?.enlace);
  if (ev?.enlace) $("#ev-enlace").href = ev.enlace;
}

// Avisos push del resumen. En iPhone solo funcionan con la app añadida a la pantalla de inicio.
const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function pintarAvisos() {
  const btn = $("#activar-avisos");
  const posible = sesion && cfg.vapidPublica && "PushManager" in window && "serviceWorker" in navigator;
  const reg = posible && await navigator.serviceWorker.ready;
  const sub = reg && await reg.pushManager.getSubscription();
  btn.classList.toggle("hidden", !posible || (sub && Notification.permission === "granted"));
}
async function activarAvisos() {
  try {
    if (await Notification.requestPermission() !== "granted") { aviso("Sin permiso no puedo avisarte. Actívalo en Ajustes."); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ??
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.vapidPublica) });
    const j = sub.toJSON();
    const { error } = await sb.from("avisos_push").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
    aviso(error ? "No se pudieron activar los avisos." : "Listo: te avisaré cada mañana.");
  } catch { aviso("Este navegador no admite avisos. En iPhone, abre la app desde la pantalla de inicio."); }
  pintarAvisos();
}
function irAResumen() {
  mostrar("inicio");
  if (sesion) traerResumen();
  $("#resumen").scrollIntoView({ behavior: "smooth", block: "start" });
}

const hora = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
function pintarEventos() {
  $("#eventos").replaceChildren(...agrupar(eventos, (e) => e.calendario).map((g) => el("li", { className: "grupo" },
    el("div", { className: "label", textContent: `${g.emoji} ${g.nombre}` }),
    el("ul", { className: "list" }, ...g.items.map((e) => el("li", { className: "evento" },
      el("span", { className: "cuando", textContent: e.dia ? "Todo el día" : `${hora(e.inicio)}–${hora(e.fin)}` }),
      el("span", { textContent: e.titulo })))))));
  $("#eventos-wrap").classList.toggle("hidden", !eventos.length);
}

const fechaCorta = (k) => desdeClave(k).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

function filaTarea(t, etiqueta) {
  const check = el("button", { type: "button", className: "dot", ariaLabel: `Hecha: ${t.texto}` });
  check.setAttribute("aria-pressed", String(t.hecha));
  check.addEventListener("click", () => { t.hecha = !t.hecha; guardarTarea(t); });
  const borrar = el("button", { type: "button", className: "del", ariaLabel: `Borrar ${t.texto}` }, icono("M6 6l12 12M18 6 6 18"));
  borrar.addEventListener("click", () => { tareas = tareas.filter((x) => x !== t); guardarTarea(t, true); });
  return el("li", { className: t.hecha ? "tarea hecha" : "tarea" }, check,
    el("span", { className: "texto", textContent: t.texto }, etiqueta ? el("small", { textContent: etiqueta }) : ""), borrar);
}

/** Hoy: atrasadas sin hacer, luego las de hoy (las hechas al final). Aparte, las de los próximos 7 días. */
function pintarTareas(k, hoy) {
  const atrasadas = tareas.filter((t) => t.fecha < k && !t.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const deHoy = tareas.filter((t) => t.fecha === k).sort((a, b) => a.hecha - b.hecha);
  const limite = clave(sumarDias(hoy, 7));
  const proximas = tareas.filter((t) => t.fecha > k && t.fecha <= limite && !t.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const etiqueta = (t) => (t.fecha < k ? `Atrasada · ${fechaCorta(t.fecha)}` : "");
  const grupos = agrupar([...atrasadas, ...deHoy], (t) => t.categoria).map((g) => el("li", { className: "grupo" },
    el("div", { className: "label", textContent: `${g.emoji} ${g.id === "otros" ? "Sin categoría" : g.nombre}` }),
    el("ul", { className: "list" }, ...g.items.map((t) => filaTarea(t, etiqueta(t))))));
  $("#tareas-hoy").replaceChildren(...(grupos.length ? grupos : [el("li", { className: "empty", textContent: "Nada para hoy." })]));
  $("#tareas-prox").replaceChildren(...proximas.map((t) =>
    filaTarea(t, `${t.categoria ? categoriaDe(t.categoria).emoji + " " : ""}${fechaCorta(t.fecha)}`)));
  $("#tareas-prox-wrap").classList.toggle("hidden", !proximas.length);
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
  pintarEventos();
  pintarTareas(k, hoy);
  pintarLista(hoy);
  pintarDashboard(hoy);
  calendario?.refrescar();
}

function mostrar(vista) {
  for (const v of document.querySelectorAll(".view")) v.classList.toggle("hidden", v.id !== `view-${vista}`);
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === vista) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
  document.documentElement.classList.toggle("cal-abierto", vista === "calendario");
  animarVista(document.getElementById(`view-${vista}`));
  if (vista === "calendario") calendario.mostrar();
  if (vista === "correos" || vista === "evangelio") scrollTo(0, 0);
}
const animarVista = (v) => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  v.classList.remove("entra");
  void v.offsetWidth;
  v.classList.add("entra");
};

let calendario = null;

document.addEventListener("DOMContentLoaded", () => {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => mostrar(b.dataset.view));
  $("#hab-nuevo").addEventListener("click", () => calendario.abrirHoja({ tipo: "habito" }));
  calendario = iniciarCalendario({
    $, el, aviso, google, eventoValido,
    sesion: () => sesion,
    tareas: () => tareas,
    guardarTarea,
    guardarHabito,
    borrarHabito,
    anadirTarea: (t) => { tareas.push(t); guardarTarea(t); },
    alCambiarEventos: () => { if (sesion) traerEventos(); },
  });
  $("#nueva-tarea").addEventListener("click", () => calendario.abrirHoja({ tipo: "tarea", fecha: clave(new Date()) }));
  // Al volver a la app: repinta con la fecha nueva y trae los cambios del otro dispositivo.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    calendario.limpiar();
    pintar();
    if (sesion) { bajar(); traerEventos(); }
  });
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-msg").textContent = "";
    const { error } = await sb.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-pass").value });
    if (error) $("#login-msg").textContent = "Email o contraseña incorrectos.";
  });
  const volver = location.origin + location.pathname;
  const datosLogin = () => ({ email: $("#login-email").value.trim(), password: $("#login-pass").value });
  const mensaje = (t, ok = false) => { $("#login-msg").textContent = t; $("#login-msg").classList.toggle("ok", ok); };
  $("#crear-cuenta").addEventListener("click", async () => {
    const { email, password } = datosLogin();
    if (!email || password.length < 8) return mensaje("Pon tu email y una contraseña de al menos 8 caracteres.");
    const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: volver } });
    mensaje(error ? "No se pudo crear la cuenta. ¿Ya existe? Prueba a entrar o a recuperar la contraseña."
      : "Cuenta creada. Si te llega un correo de confirmación, ábrelo y vuelve aquí.", !error);
  });
  $("#olvido").addEventListener("click", async () => {
    const { email } = datosLogin();
    if (!email) return mensaje("Escribe tu email arriba y vuelve a pulsar.");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: volver });
    mensaje(error ? "No se pudo enviar el correo. Inténtalo en un minuto." : "Te he enviado un correo para cambiar la contraseña.", !error);
  });
  $("#salir").addEventListener("click", async () => {
    await sb.auth.signOut();
    habitos = [];
    tareas = [];
    eventos = [];
    $("#resumen-hora").textContent = "";
    $("#resumen-cuerpo").replaceChildren(el("p", { className: "empty", textContent: "Inicia sesión para ver el resumen." }));
    calendario.limpiar();
    guardarLocal();
    pintar();
  });
  if (sb) {
    sb.auth.onAuthStateChange((evento, s) => {
      // Al abrir el enlace del correo de recuperación: pide la contraseña nueva.
      if (evento === "PASSWORD_RECOVERY") setTimeout(async () => {
        const nueva = prompt("Escribe tu contraseña nueva (mínimo 8 caracteres)");
        if (nueva && nueva.length >= 8) {
          const { error } = await sb.auth.updateUser({ password: nueva });
          aviso(error ? "No se pudo cambiar la contraseña." : "Contraseña cambiada.");
        }
      });
      const entra = !sesion && s;
      sesion = s;
      pintarSesion();
      if (entra) setTimeout(() => { bajar(); traerEventos(); traerResumen(); }); // fuera del callback, como pide supabase-js
    });
  } else pintarSesion();
  mostrar("inicio");
  pintar();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.abrir === "resumen") irAResumen(); });
  }
  $("#activar-avisos").addEventListener("click", activarAvisos);
  addEventListener("hashchange", () => { if (location.hash === "#resumen") irAResumen(); });
  if (location.hash === "#resumen") setTimeout(irAResumen, 300);
});
