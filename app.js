import { clave, desdeClave, sumarDias, ultimosDias, tasaSemanal, tasaDia, esDiario, hechosSemana, racha, mejor } from "./stats.js";
import { emojiDe } from "./emoji.js";
import { agrupar, CATEGORIAS, categoriaDe } from "./categorias.js";
import { rejillaMes, lunesDe, mover, delDia } from "./agenda.js";

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
const deFila = (f) => ({ id: f.id, nombre: f.nombre, creado: f.creado, dias: f.dias, ...(f.meta < 7 && { meta: f.meta }) });
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

function cambiarFrecuencia(h) {
  const r = prompt(`¿Cuántas veces por semana quieres hacer «${h.nombre}»? (1 a 7; 7 = cada día)`, h.meta ?? 7);
  if (r === null) return;
  const n = Number(r);
  if (!Number.isInteger(n) || n < 1 || n > 7) return aviso("Pon un número del 1 al 7.");
  h.meta = n;
  guardar(h);
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
        guardar(h);
        if (!esDiario(h) && antes < h.meta && hechosSemana(h.dias, hoy) >= h.meta) aviso(`¡${h.nombre}: semana cumplida!`);
      });
      return b;
    }),
    (() => {
      const b = el("button", { type: "button", className: "del", ariaLabel: `Borrar ${h.nombre}` }, icono("M6 6l12 12M18 6 6 18"));
      b.addEventListener("click", () => {
        if (confirm(`¿Borrar «${h.nombre}» y todo su historial?`)) { habitos = habitos.filter((x) => x !== h); guardar(h, true); }
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
  if (!$("#view-calendario").classList.contains("hidden")) pintarCal();
}

// ---- Pestaña Calendario: mes → semana → día. Eventos de Google por mes, en memoria. ----
const cal = { modo: "mes", fecha: new Date(), meses: new Map(), cargando: new Set(), error: false };
const HORA_PX = 44;
const MESES_TXT = (d, o) => d.toLocaleDateString("es-ES", o);
const claveMes = (d) => clave(d).slice(0, 7);

async function cargarMes(d) {
  const km = claveMes(d);
  if (!sesion || cal.meses.has(km) || cal.cargando.has(km)) return;
  cal.cargando.add(km);
  pintarEstado();
  const r = rejillaMes(d);
  const { data, error } = await google({ accion: "listar", desde: r[0].toISOString(), hasta: sumarDias(r[41], 1).toISOString() });
  cal.cargando.delete(km);
  cal.error = !!error;
  // Si falla, se guarda vacío para no reintentar en bucle; se reintenta al volver a la app.
  cal.meses.set(km, !error && Array.isArray(data?.eventos) ? data.eventos.filter(eventoValido) : []);
  if (claveMes(cal.fecha) === km) pintarCal();
}
const eventosCal = () => cal.meses.get(claveMes(cal.fecha)) ?? [];

function pintarEstado() {
  $("#cal-estado").textContent = !sesion ? "Inicia sesión para ver tu Google Calendar."
    : cal.cargando.has(claveMes(cal.fecha)) ? "Cargando…" : cal.error ? "No se pudo cargar el calendario." : "";
}

const colorDe = (e) => categoriaDe(e.calendario).color;
function chip(e, clase = "chip") {
  const c = el("span", { className: clase, textContent: e.titulo });
  c.style.setProperty("--c", colorDe(e));
  return c;
}

function vistaMes() {
  const hoy = clave(new Date()), mes = cal.fecha.getMonth(), ev = eventosCal();
  const dias = rejillaMes(cal.fecha);
  const filas = Array.from({ length: 6 }, (_, f) => el("div", { className: "mes-fila" }, ...dias.slice(f * 7, f * 7 + 7).map((d) => {
    const k = clave(d), { todoDia, conHora } = delDia(ev, k), todos = [...todoDia, ...conHora];
    const b = el("button", { type: "button", className: `celda${d.getMonth() !== mes ? " fuera" : ""}${k === hoy ? " hoy" : ""}` },
      el("span", { className: "num", textContent: d.getDate() }),
      ...todos.slice(0, 3).map((e) => chip(e)),
      todos.length > 3 ? el("span", { className: "mas", textContent: `+${todos.length - 3}` }) : "");
    b.setAttribute("aria-label", `${MESES_TXT(d, { weekday: "long", day: "numeric", month: "long" })}, ${todos.length} eventos`);
    b.addEventListener("click", () => irA("semana", d, b.parentElement));
    return b;
  })));
  return el("div", { className: "mes" },
    el("div", { className: "mes-cab" }, ...["L", "M", "X", "J", "V", "S", "D"].map((l) => el("span", { textContent: l }))), ...filas);
}

/** Rejilla de horas para uno (día) o siete (semana) días. */
function vistaHoras(dias, scroll) {
  const hoy = clave(new Date()), ev = eventosCal(), semana = dias.length > 1;
  const datos = dias.map((d) => ({ d, k: clave(d), ...delDia(ev, clave(d)) }));
  const cab = el("div", { className: "h-cab" }, el("span"), ...datos.map(({ d, k }) => {
    const b = el("button", { type: "button", className: k === hoy ? "hoy" : "" },
      el("small", { textContent: MESES_TXT(d, { weekday: "short" }) }), el("b", { textContent: d.getDate() }));
    if (semana) b.addEventListener("click", () => irA("dia", d, b));
    else b.disabled = true;
    return b;
  }));
  const conTodoDia = datos.some((x) => x.todoDia.length);
  const todoDia = el("div", { className: `h-todo${conTodoDia ? "" : " hidden"}` }, el("span", { className: "h-lbl", textContent: "Todo el día" }),
    ...datos.map((x) => el("div", {}, ...x.todoDia.map((e) => {
      const c = chip(e);
      if (!semana) c.addEventListener("click", () => abrirEvento(e));
      return c;
    }))));
  const horas = el("div", { className: "h-horas" }, ...Array.from({ length: 24 }, (_, h) => el("span", { textContent: h ? `${String(h).padStart(2, "0")}:00` : "" })));
  const cols = datos.map(({ d, k, conHora }) => {
    const col = el("div", { className: `h-col${k === hoy ? " hoy" : ""}` }, ...conHora.map((e, i) => {
      const b = el("div", { className: "bloque" }, el("b", { textContent: e.titulo }),
        el("small", { textContent: `${hora(e.inicio)}–${hora(e.fin)}` }));
      b.style.setProperty("--c", colorDe(e));
      b.style.top = `${(e.desde / 60) * HORA_PX}px`;
      b.style.height = `${Math.max(((e.hasta - e.desde) / 60) * HORA_PX - 2, 18)}px`;
      b.style.left = `${(e.col / e.cols) * 100}%`;
      b.style.width = `calc(${100 / e.cols}% - 2px)`;
      b.dataset.i = i;
      return b;
    }));
    if (k === hoy) {
      const n = new Date(), linea = el("div", { className: "ahora" });
      linea.style.top = `${((n.getHours() * 60 + n.getMinutes()) / 60) * HORA_PX}px`;
      col.append(linea);
    }
    if (semana) col.addEventListener("click", () => irA("dia", d, col));
    else col.addEventListener("click", (ev) => {
      const bloque = ev.target.closest(".bloque");
      if (bloque) return abrirEvento(conHora[bloque.dataset.i]);
      const h = Math.min(Math.floor((ev.clientY - col.getBoundingClientRect().top) / HORA_PX), 23);
      abrirEvento(null, new Date(d.getFullYear(), d.getMonth(), d.getDate(), h));
    });
    return col;
  });
  const cuerpo = el("div", { className: "h-scroll" }, el("div", { className: "h-cuerpo" }, horas, ...cols));
  const vista = el("div", { className: `horas ${semana ? "sem" : "uno"}` }, cab, todoDia, cuerpo);
  if (!semana) {
    const k = clave(dias[0]), lista = tareas.filter((t) => t.fecha === k).sort((a, b) => a.hecha - b.hecha);
    if (lista.length) vista.append(el("div", { className: "label", textContent: "Tareas" }),
      el("ul", { className: "list" }, ...lista.map((t) => filaTarea(t, t.categoria ? `${categoriaDe(t.categoria).emoji} ${categoriaDe(t.categoria).nombre}` : ""))));
  }
  // Al abrir, baja hasta la hora actual (hoy) o hasta las 7:00. Al repintar la misma vista, se queda donde estaba.
  requestAnimationFrame(() => {
    const n = new Date(), h = datos.some((x) => x.k === hoy) ? Math.max(n.getHours() - 1, 0) : 7;
    cuerpo.scrollTop = scroll ?? h * HORA_PX;
  });
  return vista;
}

function pintarCal() {
  const d = cal.fecha;
  $("#cal-titulo").textContent = cal.modo === "dia" ? MESES_TXT(d, { weekday: "long", day: "numeric", month: "long" })
    : MESES_TXT(d, { month: "long", year: "numeric" });
  for (const b of document.querySelectorAll("[data-modo]")) b.setAttribute("aria-pressed", String(b.dataset.modo === cal.modo));
  pintarEstado();
  const vista = `${cal.modo} ${clave(cal.modo === "semana" ? lunesDe(d) : d)}`;
  const scroll = vista === cal.vista ? $("#cal .h-scroll")?.scrollTop : undefined;
  cal.vista = vista;
  $("#cal").replaceChildren(cal.modo === "mes" ? vistaMes()
    : vistaHoras(cal.modo === "dia" ? [d] : Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(d), i)), scroll));
  cargarMes(d);
}

/** Cambia de vista con una animación: acercar (mes→semana→día), alejar o deslizar. */
const NIVEL = { mes: 0, semana: 1, dia: 2 };
function irA(modo, fecha, origen) {
  const anim = NIVEL[modo] > NIVEL[cal.modo] ? "acercar" : NIVEL[modo] < NIVEL[cal.modo] ? "alejar"
    : fecha > cal.fecha ? "sig" : fecha < cal.fecha ? "ant" : "";
  const caja = $("#cal").getBoundingClientRect();
  const punto = (r) => `${r.left + r.width / 2 - caja.left}px ${r.top + r.height / 2 - caja.top}px`;
  let foco = origen ? punto(origen.getBoundingClientRect()) : "50% 0";
  cal.modo = modo;
  cal.fecha = fecha;
  pintarCal();
  // Al alejar, la vista nueva sale del sitio donde estaba la anterior (la fila de la semana o la columna del día).
  if (anim === "alejar") {
    const k = clave(fecha);
    const destino = modo === "mes" ? [...document.querySelectorAll(".mes-fila")].find((f, i) => rejillaMes(fecha).slice(i * 7, i * 7 + 7).some((d) => clave(d) === k))
      : document.querySelectorAll(".h-col")[(fecha.getDay() + 6) % 7];
    if (destino) foco = punto(destino.getBoundingClientRect());
  }
  const c = $("#cal");
  if (!anim || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  c.style.transformOrigin = foco;
  c.classList.remove("acercar", "alejar", "sig", "ant");
  void c.offsetWidth;
  c.classList.add(anim);
}

// ---- Crear, editar y borrar eventos de Google Calendar ----
let calendarios = null, editando = null;
const horaTxt = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const enFecha = (k, hhmm) => { const [h, m] = hhmm.split(":").map(Number); const d = desdeClave(k); d.setHours(h, m); return d; };

async function cargarCalendarios() {
  if (calendarios) return;
  const { data, error } = await google({ accion: "calendarios" });
  if (error || !Array.isArray(data?.calendarios)) throw new Error();
  const orden = (c) => { const i = CATEGORIAS.findIndex((x) => x.id === categoriaDe(c.nombre).id); return i < 0 ? 99 : i; };
  calendarios = data.calendarios.filter((c) => typeof c?.id === "string" && typeof c.nombre === "string").sort((a, b) => orden(a) - orden(b));
  $("#ev-cal").replaceChildren(...calendarios.map((c) => el("option", { value: c.id, textContent: `${categoriaDe(c.nombre).emoji} ${c.nombre}` })));
}

/** Abre el formulario: con un evento para editarlo, o vacío (a la hora `cuando`) para crear uno. */
async function abrirEvento(e, cuando) {
  if (!sesion) return aviso("Inicia sesión para usar el calendario.");
  editando = e && e.id && e.cal ? e : null;
  if (e && !editando) return aviso("Este evento no se puede editar desde aquí.");
  const ini = e ? (e.dia ? desdeClave(e.dia) : new Date(e.inicio)) : cuando ?? new Date(cal.fecha.getFullYear(), cal.fecha.getMonth(), cal.fecha.getDate(), new Date().getHours() + 1);
  const fin = e && !e.dia ? new Date(e.fin) : new Date(ini.getTime() + 3600000);
  $("#ev-tit").textContent = e ? "Editar evento" : "Nuevo evento";
  $("#ev-titulo").value = e?.titulo ?? "";
  $("#ev-todo").checked = !!e?.dia;
  $("#ev-fecha").value = clave(ini);
  $("#ev-ini").value = horaTxt(ini);
  $("#ev-fin").value = horaTxt(fin);
  $("#ev-borrar").classList.toggle("hidden", !editando);
  $("#ev-msg").textContent = "";
  ajustarTodoDia();
  $("#ev-dlg").showModal();
  try {
    await cargarCalendarios();
    $("#ev-cal").value = editando?.cal ?? calendarios[0]?.id ?? "";
    $("#ev-cal").disabled = !!editando; // Cambiar de calendario no está soportado: se borra y se crea de nuevo.
  } catch { $("#ev-msg").textContent = "No se pudo conectar con Google Calendar."; }
}
const ajustarTodoDia = () => { for (const i of ["#ev-ini", "#ev-fin"]) $(i).classList.toggle("hidden", $("#ev-todo").checked); };

async function enviarEvento(accion) {
  const k = $("#ev-fecha").value, titulo = $("#ev-titulo").value.trim().slice(0, 200);
  const p = { accion, cal: $("#ev-cal").value };
  if (accion !== "borrar") {
    if (!titulo || !FECHA.test(k)) return;
    p.titulo = titulo;
    if ($("#ev-todo").checked) {
      const dias = editando?.dia && editando.diaFin ? Math.max(1, Math.round((desdeClave(editando.diaFin) - desdeClave(editando.dia)) / 86400000)) : 1;
      Object.assign(p, { dia: k, diaFin: clave(sumarDias(desdeClave(k), dias)) });
    } else {
      const i = enFecha(k, $("#ev-ini").value || "09:00");
      let f = enFecha(k, $("#ev-fin").value || "10:00");
      if (f <= i) f = sumarDias(f, 1); // termina pasada la medianoche
      Object.assign(p, { inicio: i.toISOString(), fin: f.toISOString() });
    }
  }
  if (editando) Object.assign(p, { id: editando.id, original: editando.dia ?? editando.inicio });
  $("#ev-msg").textContent = "Guardando…";
  const { data, error } = await google(p);
  if (error || data?.error) return ($("#ev-msg").textContent = "No se pudo guardar en Google Calendar. Inténtalo de nuevo.");
  $("#ev-dlg").close();
  aviso(accion === "borrar" ? "Evento borrado" : "Evento guardado");
  cal.meses.clear();
  pintarCal();
  traerEventos();
}

function mostrar(vista) {
  for (const v of document.querySelectorAll(".view")) v.classList.toggle("hidden", v.id !== `view-${vista}`);
  for (const b of document.querySelectorAll("[data-view]")) {
    if (b.dataset.view === vista) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  }
  if (vista === "calendario") pintarCal();
}

document.addEventListener("DOMContentLoaded", () => {
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => mostrar(b.dataset.view));
  $("#nuevo").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = $("#nuevo-nombre").value.trim().slice(0, 60);
    if (!nombre) return;
    const meta = Number($("#nuevo-meta").value);
    const h = { id: crypto.randomUUID(), nombre, creado: clave(new Date()), dias: [], ...(meta < 7 && { meta }) };
    habitos.push(h);
    $("#nuevo-nombre").value = "";
    guardar(h);
  });
  for (const b of document.querySelectorAll("[data-modo]")) b.addEventListener("click", () => irA(b.dataset.modo, cal.fecha));
  $("#cal-prev").addEventListener("click", () => irA(cal.modo, mover(cal.modo, cal.fecha, -1)));
  $("#cal-next").addEventListener("click", () => irA(cal.modo, mover(cal.modo, cal.fecha, 1)));
  $("#cal-hoy").addEventListener("click", () => irA(cal.modo, new Date()));
  $("#cal-nuevo").addEventListener("click", () => abrirEvento(null));
  $("#ev-todo").addEventListener("change", ajustarTodoDia);
  $("#ev-cancelar").addEventListener("click", () => $("#ev-dlg").close());
  $("#ev-borrar").addEventListener("click", () => { if (confirm(`¿Borrar «${editando.titulo}» de Google Calendar?`)) enviarEvento("borrar"); });
  $("#ev-form").addEventListener("submit", (e) => { e.preventDefault(); enviarEvento(editando ? "editar" : "crear"); });
  // Deslizar a los lados cambia de mes, semana o día.
  let toque = null;
  $("#cal").addEventListener("touchstart", (e) => { toque = e.touches[0]; }, { passive: true });
  $("#cal").addEventListener("touchend", (e) => {
    const t = e.changedTouches[0], dx = t.clientX - (toque?.clientX ?? t.clientX), dy = t.clientY - (toque?.clientY ?? t.clientY);
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) irA(cal.modo, mover(cal.modo, cal.fecha, dx < 0 ? 1 : -1));
    toque = null;
  });
  $("#tarea-fecha").value = clave(new Date());
  $("#tarea-categoria").append(...CATEGORIAS.map((c) => el("option", { value: c.id, textContent: `${c.emoji} ${c.nombre}` })));
  $("#nueva-tarea").addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = $("#tarea-texto").value.trim().slice(0, 120);
    const fecha = FECHA.test($("#tarea-fecha").value) ? $("#tarea-fecha").value : clave(new Date());
    if (!texto) return;
    const cat = $("#tarea-categoria").value;
    const t = { id: crypto.randomUUID(), texto, fecha, hecha: false, ...(CATEGORIAS.some((c) => c.id === cat) && { categoria: cat }) };
    tareas.push(t);
    $("#tarea-texto").value = "";
    for (const b of document.querySelectorAll("[data-modo]")) b.addEventListener("click", () => irA(b.dataset.modo, cal.fecha));
  $("#cal-prev").addEventListener("click", () => irA(cal.modo, mover(cal.modo, cal.fecha, -1)));
  $("#cal-next").addEventListener("click", () => irA(cal.modo, mover(cal.modo, cal.fecha, 1)));
  $("#cal-hoy").addEventListener("click", () => irA(cal.modo, new Date()));
  $("#cal-nuevo").addEventListener("click", () => abrirEvento(null));
  $("#ev-todo").addEventListener("change", ajustarTodoDia);
  $("#ev-cancelar").addEventListener("click", () => $("#ev-dlg").close());
  $("#ev-borrar").addEventListener("click", () => { if (confirm(`¿Borrar «${editando.titulo}» de Google Calendar?`)) enviarEvento("borrar"); });
  $("#ev-form").addEventListener("submit", (e) => { e.preventDefault(); enviarEvento(editando ? "editar" : "crear"); });
  // Deslizar a los lados cambia de mes, semana o día.
  let toque = null;
  $("#cal").addEventListener("touchstart", (e) => { toque = e.touches[0]; }, { passive: true });
  $("#cal").addEventListener("touchend", (e) => {
    const t = e.changedTouches[0], dx = t.clientX - (toque?.clientX ?? t.clientX), dy = t.clientY - (toque?.clientY ?? t.clientY);
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) irA(cal.modo, mover(cal.modo, cal.fecha, dx < 0 ? 1 : -1));
    toque = null;
  });
  $("#tarea-fecha").value = clave(new Date());
    guardarTarea(t);
  });
  // Al volver a la app: repinta con la fecha nueva y trae los cambios del otro dispositivo.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    pintar();
    cal.meses.clear();
    if (!$("#view-calendario").classList.contains("hidden")) pintarCal();
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
    cal.meses.clear();
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
      if (entra) setTimeout(() => { bajar(); traerEventos(); }); // fuera del callback, como pide supabase-js
    });
  } else pintarSesion();
  mostrar("inicio");
  pintar();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
});
