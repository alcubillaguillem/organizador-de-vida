import { clave, desdeClave, sumarDias, ultimosDias, tasaSemanal, tasaDia, esDiario, hechosSemana, racha, mejor } from "./stats.js";
import { emojiDe } from "./emoji.js";
import { agrupar } from "./categorias.js";

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
  FECHA.test(t.fecha) && typeof t.hecha === "boolean";

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
const aFilaT = (t) => ({ id: t.id, texto: t.texto, fecha: t.fecha, hecha: t.hecha, updated_at: ahora() });
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
    traer("tareas", "id,texto,fecha,hecha", tareas, aFilaT),
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

// Eventos de Google Calendar de hoy (función "calendario" de Supabase). Solo en memoria.
let eventos = [];
async function traerEventos() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const { data, error } = await sb.functions.invoke("calendario", {
    body: { desde: desde.toISOString(), hasta: sumarDias(desde, 1).toISOString() },
  });
  eventos = !error && Array.isArray(data?.eventos) ? data.eventos.filter((e) => typeof e?.titulo === "string" && (e.calendario === undefined || typeof e.calendario === "string")) : [];
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
  const lista = [...atrasadas.map((t) => filaTarea(t, `Atrasada · ${fechaCorta(t.fecha)}`)), ...deHoy.map((t) => filaTarea(t))];
  $("#tareas-hoy").replaceChildren(...(lista.length ? lista : [el("li", { className: "empty", textContent: "Nada para hoy." })]));
  $("#tareas-prox").replaceChildren(...proximas.map((t) => filaTarea(t, fechaCorta(t.fecha))));
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
    const h = { id: crypto.randomUUID(), nombre, creado: clave(new Date()), dias: [], ...(meta < 7 && { meta }) };
    habitos.push(h);
    $("#nuevo-nombre").value = "";
    guardar(h);
  });
  $("#tarea-fecha").value = clave(new Date());
  $("#nueva-tarea").addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = $("#tarea-texto").value.trim().slice(0, 120);
    const fecha = FECHA.test($("#tarea-fecha").value) ? $("#tarea-fecha").value : clave(new Date());
    if (!texto) return;
    const t = { id: crypto.randomUUID(), texto, fecha, hecha: false };
    tareas.push(t);
    $("#tarea-texto").value = "";
    $("#tarea-fecha").value = clave(new Date());
    guardarTarea(t);
  });
  // Al volver a la app: repinta con la fecha nueva y trae los cambios del otro dispositivo.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
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
