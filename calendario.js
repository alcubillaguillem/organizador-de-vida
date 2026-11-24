// Pestaña Calendario (mes y día) y hoja para crear o editar eventos y tareas.
// Los eventos vienen de Google Calendar (por mes, en memoria). El texto siempre va por textContent.
import { clave, sumarDias, desdeClave } from "./stats.js";
import { rejillaMes, lunesDe, mover, delDia } from "./agenda.js";
import { CATEGORIAS, categoriaDe } from "./categorias.js";

const HORA_PX = 64;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const LETRAS = ["L", "M", "X", "J", "V", "S", "D"];
const txt = (d, o) => d.toLocaleDateString("es-ES", o);
const hora = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const claveMes = (d) => clave(d).slice(0, 7);
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sinMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const colorDe = (e) => categoriaDe(e.calendario).color;
const pinta = (nodo, color) => { nodo.style.setProperty("--c", color); return nodo; };

/** Reproduce una animación CSS (clase) sobre un nodo, con el origen opcional en un punto. */
function animar(nodo, clase, origen) {
  if (sinMovimiento()) return;
  nodo.style.transformOrigin = origen ?? "";
  nodo.classList.remove(clase);
  void nodo.offsetWidth;
  nodo.classList.add(clase);
  nodo.addEventListener("animationend", () => nodo.classList.remove(clase), { once: true });
}

/** Arrastre horizontal que sigue al dedo. `cambiar(paso)` se llama al soltar si se pasó el umbral. */
function deslizable(zona, cambiar) {
  let x0 = 0, y0 = 0, eje = null, dx = 0;
  zona.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; eje = null; dx = 0; }, { passive: true });
  zona.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    dx = t.clientX - x0;
    if (!eje && (Math.abs(dx) > 8 || Math.abs(t.clientY - y0) > 8)) eje = Math.abs(dx) > Math.abs(t.clientY - y0) ? "x" : "y";
    if (eje !== "x") return;
    zona.style.transition = "none";
    zona.style.transform = `translateX(${dx}px)`;
    zona.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.35));
  }, { passive: true });
  zona.addEventListener("touchend", () => {
    if (eje !== "x") return;
    zona.style.transition = "";
    zona.style.transform = "";
    zona.style.opacity = "";
    if (Math.abs(dx) > 60) cambiar(dx < 0 ? 1 : -1);
  });
}

export function iniciarCalendario(ctx) {
  const { $, el, aviso, google } = ctx;
  const cal = { modo: "mes", fecha: new Date(), meses: new Map(), cargando: new Set(), error: false };

  // ---------- Datos ----------
  async function cargarMes(d, vecinos = true) {
    const km = claveMes(d);
    if (!ctx.sesion() || cal.meses.has(km) || cal.cargando.has(km)) return;
    cal.cargando.add(km);
    estado();
    const r = rejillaMes(d);
    const { data, error } = await google({ accion: "listar", desde: r[0].toISOString(), hasta: sumarDias(r[41], 1).toISOString() });
    cal.cargando.delete(km);
    cal.error = !!error;
    // Si falla, se guarda vacío para no reintentar en bucle; se reintenta al volver a la app.
    cal.meses.set(km, !error && Array.isArray(data?.eventos) ? data.eventos.filter(ctx.eventoValido) : []);
    estado();
    if (visible()) refrescar();
    // Deja listos el mes anterior y el siguiente para que cambiar de mes sea instantáneo.
    if (vecinos && !error) { cargarMes(mover("mes", d, 1), false); cargarMes(mover("mes", d, -1), false); }
  }
  /** Eventos de un día, del mes de ese día o, si aún no está, del mes que se está viendo. */
  function delDiaK(k) {
    const lista = cal.meses.get(k.slice(0, 7)) ?? cal.meses.get(claveMes(cal.fecha)) ?? [];
    return delDia(lista, k);
  }
  const tareasDe = (k) => ctx.tareas().filter((t) => t.fecha === k).sort((a, b) => a.hecha - b.hecha);
  const visible = () => !$("#view-calendario").classList.contains("hidden");

  function estado() {
    const cargando = cal.cargando.has(claveMes(cal.fecha));
    $("#cal-carga").classList.toggle("activo", cargando);
    $("#cal-sub").textContent = !ctx.sesion() ? "Inicia sesión para ver tu Google Calendar"
      : cal.error && !cargando ? "No se pudo cargar. Vuelve a abrir la app." : cabecera().sub;
  }

  // ---------- Cabecera ----------
  function cabecera() {
    const d = cal.fecha;
    return cal.modo === "mes"
      ? { titulo: mayus(txt(d, { month: "long" })), sub: String(d.getFullYear()) }
      : { titulo: mayus(txt(d, { weekday: "long", day: "numeric" })), sub: `${txt(d, { month: "long" })} ${d.getFullYear()}` };
  }
  function pintarCabecera(animado) {
    const c = cabecera();
    if ($("#cal-titulo").textContent !== c.titulo && animado) animar($("#cal-tit"), "titulo-cambia");
    $("#cal-titulo").textContent = c.titulo;
    estado();
    $("#cal-seg").dataset.modo = cal.modo;
    for (const b of document.querySelectorAll("#cal-seg [data-modo]")) b.setAttribute("aria-pressed", String(b.dataset.modo === cal.modo));
  }

  // ---------- Vista mes ----------
  function filaPanel(item) {
    if (item.texto !== undefined) { // tarea
      const check = el("button", { type: "button", className: "check", ariaLabel: `Hecha: ${item.texto}` });
      check.setAttribute("aria-pressed", String(item.hecha));
      check.addEventListener("click", () => { item.hecha = !item.hecha; ctx.guardarTarea(item); });
      return el("li", { className: `p-fila p-tarea${item.hecha ? " hecha" : ""}` }, check,
        el("span", { className: "p-hora", textContent: "Tarea" }), el("span", { className: "p-tit", textContent: item.texto }));
    }
    const li = el("li", { className: "p-fila p-ev", tabIndex: 0 },
      pinta(el("i", { className: "p-punto" }), colorDe(item)),
      el("span", { className: "p-hora", textContent: item.dia ? "Todo el día" : `${hora(item.inicio)} – ${hora(item.fin)}` }),
      el("span", { className: "p-tit", textContent: item.titulo }));
    li.addEventListener("click", () => abrirHoja({ evento: item }));
    return li;
  }

  function pintarPanel(animado) {
    const k = clave(cal.fecha), { todoDia, conHora } = delDiaK(k), tareas = tareasDe(k);
    const n = todoDia.length + conHora.length;
    const resumen = [n ? `${n} ${n === 1 ? "evento" : "eventos"}` : "", tareas.length ? `${tareas.length} ${tareas.length === 1 ? "tarea" : "tareas"}` : ""].filter(Boolean).join(" · ");
    const abrir = el("button", { type: "button", className: "p-abrir", textContent: "Ver día ›" });
    abrir.addEventListener("click", () => irADia(cal.fecha, $(`#cal .casilla[data-k="${k}"]`)));
    const lista = el("ul", { className: "p-lista" }, ...[...todoDia, ...conHora, ...tareas].map(filaPanel));
    if (!n && !tareas.length) {
      const anadir = el("button", { type: "button", className: "p-vacio-btn", textContent: "+ Añadir algo" });
      anadir.addEventListener("click", () => abrirHoja({ fecha: k }));
      lista.append(el("li", { className: "p-vacio" }, el("span", { textContent: "Día libre" }), anadir));
    }
    $("#cal .panel").replaceChildren(el("div", { className: "asa" }),
      el("header", {}, el("div", {}, el("h3", { textContent: mayus(txt(cal.fecha, { weekday: "long", day: "numeric" })) }),
        el("small", { textContent: resumen || "Sin planes" })), abrir), lista);
    if (animado) animar(lista, "panel-entra");
  }

  function vistaMes() {
    const hoy = clave(new Date()), mes = cal.fecha.getMonth(), sel = clave(cal.fecha);
    const dias = rejillaMes(cal.fecha);
    const filas = dias.slice(35).some((d) => d.getMonth() === mes) ? 6 : 5;
    const grid = el("div", { className: "mes-grid" }, ...dias.slice(0, filas * 7).map((d) => {
      const k = clave(d), { todoDia, conHora } = delDiaK(k), todos = [...todoDia, ...conHora];
      const b = el("button", { type: "button", className: `casilla${d.getMonth() !== mes ? " fuera" : ""}${k === hoy ? " hoy" : ""}${k === sel ? " sel" : ""}` },
        el("span", { className: "n", textContent: d.getDate() }),
        el("span", { className: "barras" }, ...todos.slice(0, 4).map((e) => pinta(el("i"), colorDe(e)))),
        el("span", { className: "titulos" }, ...todos.slice(0, 3).map((e) => pinta(el("i", { textContent: e.titulo }), colorDe(e))),
          todos.length > 3 ? el("small", { textContent: `+${todos.length - 3}` }) : ""));
      b.dataset.k = k;
      b.setAttribute("aria-label", `${txt(d, { weekday: "long", day: "numeric", month: "long" })}: ${todos.length} eventos`);
      b.addEventListener("click", () => {
        if (clave(cal.fecha) === k) return irADia(d, b); // segundo toque: abre el día
        if (d.getMonth() !== mes) return cambiarMes(d < cal.fecha ? -1 : 1, d);
        for (const c of grid.querySelectorAll(".casilla.sel")) c.classList.remove("sel");
        b.classList.add("sel");
        cal.fecha = d;
        pintarPanel(true);
      });
      return b;
    }));
    grid.dataset.filas = filas;
    const mesEl = el("div", { className: "mes" }, el("div", { className: "mes-cab" }, ...LETRAS.map((l) => el("span", { textContent: l }))), grid);
    deslizable(mesEl, (paso) => cambiarMes(paso));
    return el("div", { className: "vista-mes" }, mesEl, el("section", { className: "panel" }));
  }

  // ---------- Vista día ----------
  function tira() {
    const lunes = lunesDe(cal.fecha), hoy = clave(new Date()), sel = clave(cal.fecha);
    const ind = el("span", { className: "tira-ind" });
    const t = el("div", { className: "tira" }, ind, ...Array.from({ length: 7 }, (_, i) => {
      const d = sumarDias(lunes, i), k = clave(d), { todoDia, conHora } = delDiaK(k);
      const cats = [...new Set([...todoDia, ...conHora].map(colorDe))].slice(0, 3);
      const b = el("button", { type: "button", className: `${k === hoy ? "hoy" : ""}${k === sel ? " sel" : ""}` },
        el("small", { textContent: LETRAS[i] }), el("b", { textContent: d.getDate() }),
        el("span", { className: "puntos" }, ...cats.map((c) => pinta(el("i"), c))));
      b.dataset.k = k;
      b.addEventListener("click", () => cambiarDia(d));
      return b;
    }));
    ind.style.transform = `translateX(${((cal.fecha.getDay() + 6) % 7) * 100}%)`;
    return t;
  }

  function cuerpoDia() {
    const d = cal.fecha, k = clave(d), { todoDia, conHora } = delDiaK(k), tareas = tareasDe(k);
    const arriba = el("div", { className: `todo-dia${todoDia.length || tareas.length ? "" : " hidden"}` },
      ...todoDia.map((e) => {
        const p = pinta(el("button", { type: "button", className: "pastilla", textContent: e.titulo }), colorDe(e));
        p.addEventListener("click", () => abrirHoja({ evento: e }));
        return p;
      }),
      ...tareas.map((t) => {
        const p = el("button", { type: "button", className: `pastilla p-tarea${t.hecha ? " hecha" : ""}` }, el("i"), t.texto);
        p.setAttribute("aria-pressed", String(t.hecha));
        p.addEventListener("click", () => { t.hecha = !t.hecha; ctx.guardarTarea(t); });
        return p;
      }));
    const lienzo = el("div", { className: "lienzo" },
      ...Array.from({ length: 24 }, (_, h) => {
        const linea = el("div", { className: "h-linea" }, el("span", { textContent: `${String(h).padStart(2, "0")}:00` }));
        linea.style.top = `${h * HORA_PX}px`;
        return linea;
      }),
      ...conHora.map((e) => {
        const corto = e.hasta - e.desde < 45;
        const c = pinta(el("button", { type: "button", className: `tarjeta${corto ? " corta" : ""}` },
          el("b", { textContent: e.titulo }),
          el("small", { textContent: `${hora(e.inicio)} – ${hora(e.fin)} · ${categoriaDe(e.calendario).emoji} ${categoriaDe(e.calendario).nombre}` })), colorDe(e));
        c.style.top = `${(e.desde / 60) * HORA_PX + 1}px`;
        c.style.height = `${Math.max(((e.hasta - e.desde) / 60) * HORA_PX - 3, 26)}px`;
        c.style.left = `calc(${(e.col / e.cols) * 100}% + 2px)`;
        c.style.width = `calc(${100 / e.cols}% - 4px)`;
        c.addEventListener("click", (ev) => { ev.stopPropagation(); abrirHoja({ evento: e }); });
        return c;
      }));
    if (k === clave(new Date())) {
      const n = new Date(), linea = el("div", { className: "ahora" });
      linea.style.top = `${((n.getHours() * 60 + n.getMinutes()) / 60) * HORA_PX}px`;
      lienzo.append(linea);
    }
    // Tocar un hueco crea un evento a esa hora (en tramos de media hora).
    lienzo.addEventListener("click", (ev) => {
      const min = Math.floor(((ev.clientY - lienzo.getBoundingClientRect().top) / HORA_PX) * 2) * 30;
      abrirHoja({ inicio: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, Math.min(Math.max(min, 0), 23 * 60 + 30)) });
    });
    const scroll = el("div", { className: "horas-scroll" }, el("div", { className: "horas-pista" }, lienzo));
    return el("div", { className: "dia-cuerpo" }, arriba, scroll);
  }

  function colocarScroll(previo) {
    const s = $("#cal .horas-scroll");
    if (!s) return;
    const n = new Date(), esHoy = clave(cal.fecha) === clave(n);
    s.scrollTop = previo ?? (esHoy ? Math.max(n.getHours() - 1, 0) : 8) * HORA_PX;
  }

  function vistaDia() {
    const cuerpo = cuerpoDia();
    const v = el("div", { className: "vista-dia" }, tira(), cuerpo);
    deslizable(v.querySelector(".dia-cuerpo"), (paso) => cambiarDia(sumarDias(cal.fecha, paso)));
    return v;
  }

  // ---------- Pintar y navegar ----------
  /** Vuelve a pintar la vista actual sin animaciones, conservando el scroll. */
  function refrescar() {
    if (!visible()) return;
    pintarCabecera(false);
    if (cal.modo === "mes") {
      const previo = [$("#cal .vista-mes")?.scrollTop, $("#cal .p-lista")?.scrollTop];
      $("#cal").replaceChildren(vistaMes());
      pintarPanel(false);
      if (previo[0]) $("#cal .vista-mes").scrollTop = previo[0];
      if (previo[1]) $("#cal .p-lista").scrollTop = previo[1];
    } else {
      const previo = $("#cal .horas-scroll")?.scrollTop;
      $("#cal").replaceChildren(vistaDia());
      requestAnimationFrame(() => colocarScroll(previo));
    }
  }

  function render() {
    pintarCabecera(true);
    if (cal.modo === "mes") { $("#cal").replaceChildren(vistaMes()); pintarPanel(false); }
    else { $("#cal").replaceChildren(vistaDia()); requestAnimationFrame(() => colocarScroll()); }
    cargarMes(cal.fecha);
  }

  const centro = (nodo) => {
    const r = nodo.getBoundingClientRect(), c = $("#cal").getBoundingClientRect();
    return `${r.left + r.width / 2 - c.left}px ${r.top + r.height / 2 - c.top}px`;
  };

  function irADia(d, origen) {
    const foco = origen ? centro(origen) : "50% 30%";
    cal.modo = "dia";
    cal.fecha = d;
    render();
    animar($("#cal"), "acercar", foco);
  }

  function irAMes() {
    cal.modo = "mes";
    render();
    const c = $(`#cal .casilla[data-k="${clave(cal.fecha)}"]`);
    animar($("#cal"), "alejar", c ? centro(c) : "50% 30%");
  }

  function cambiarMes(paso, destino) {
    cal.fecha = destino ?? mover("mes", cal.fecha, paso);
    render();
    animar($("#cal .mes"), paso > 0 ? "entra-der" : "entra-izq");
    animar($("#cal .panel .p-lista"), "panel-entra");
  }

  function cambiarDia(d) {
    const antes = cal.fecha, paso = d > antes ? 1 : -1;
    if (clave(d) === clave(antes)) return;
    cal.fecha = d;
    pintarCabecera(true);
    if (clave(lunesDe(d)) === clave(lunesDe(antes))) {
      // Misma semana: el indicador se desliza al día nuevo y solo cambia el cuerpo.
      const t = $("#cal .tira");
      t.querySelector(".tira-ind").style.transform = `translateX(${((d.getDay() + 6) % 7) * 100}%)`;
      for (const b of t.querySelectorAll("button")) b.classList.toggle("sel", b.dataset.k === clave(d));
      const nuevo = cuerpoDia();
      $("#cal .dia-cuerpo").replaceWith(nuevo);
      deslizable(nuevo, (p) => cambiarDia(sumarDias(cal.fecha, p)));
      animar(nuevo, paso > 0 ? "entra-der" : "entra-izq");
    } else {
      $("#cal").replaceChildren(vistaDia());
      animar($("#cal .vista-dia"), paso > 0 ? "entra-der" : "entra-izq");
    }
    requestAnimationFrame(() => colocarScroll());
    cargarMes(d);
  }

  // ---------- Hoja: nuevo o editar evento / tarea ----------
  let calendarios = null, hoja = null, ultimoCal = null;
  async function cargarCalendarios() {
    if (calendarios) return;
    const { data, error } = await google({ accion: "calendarios" });
    if (error || !Array.isArray(data?.calendarios)) throw new Error();
    const orden = (c) => { const i = CATEGORIAS.findIndex((x) => x.id === categoriaDe(c.nombre).id); return i < 0 ? 99 : i; };
    calendarios = data.calendarios.filter((c) => typeof c?.id === "string" && typeof c.nombre === "string").sort((a, b) => orden(a) - orden(b));
  }
  const horaTxt = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const enFecha = (k, hhmm) => { const [h, m] = hhmm.split(":").map(Number); const d = desdeClave(k); d.setHours(h, m); return d; };

  function chipsCats() {
    const cont = $("#h-cats");
    const elegir = (b) => { for (const x of cont.children) x.setAttribute("aria-pressed", String(x === b)); b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }); };
    const chip = (valor, etiqueta, color) => {
      const b = pinta(el("button", { type: "button", className: "h-chip", textContent: etiqueta }), color);
      b.dataset.valor = valor;
      b.addEventListener("click", () => elegir(b));
      return b;
    };
    if (hoja.tipo === "habito") {
      const meta = hoja.habito?.meta ?? 7;
      cont.replaceChildren(...[7, 1, 2, 3, 4, 5, 6].map((n) => chip(String(n), n === 7 ? "Cada día" : `${n}×/semana`, "#c5f04a")));
      elegir([...cont.children].find((b) => b.dataset.valor === String(meta)));
      return;
    }
    if (hoja.tipo === "tarea") {
      cont.replaceChildren(chip("", "Sin categoría", "#9a9aa3"), ...CATEGORIAS.map((c) => chip(c.id, `${c.emoji} ${c.nombre}`, c.color)));
      elegir([...cont.children].find((b) => b.dataset.valor === (hoja.categoria ?? "")) ?? cont.firstChild);
      return;
    }
    if (!calendarios) { cont.replaceChildren(el("span", { className: "h-cargando", textContent: "Cargando tus calendarios…" })); return; }
    const editando = !!hoja.evento;
    const visibles = editando ? calendarios.filter((c) => c.id === hoja.evento.cal) : calendarios;
    cont.replaceChildren(...visibles.map((c) => chip(c.id, `${categoriaDe(c.nombre).emoji} ${c.nombre}`, categoriaDe(c.nombre).color)));
    const actual = editando ? hoja.evento.cal : ultimoCal;
    elegir([...cont.children].find((b) => b.dataset.valor === actual) ?? cont.firstChild);
  }

  function ajustarHoja() {
    const tarea = hoja.tipo === "tarea", habito = hoja.tipo === "habito", todo = $("#h-todo").checked;
    $("#hoja").dataset.tipo = hoja.tipo;
    $("#h-tipo").dataset.modo = hoja.tipo;
    $("#h-titulo").placeholder = habito ? "Nombre del hábito" : tarea ? "¿Qué tienes que hacer?" : "Título del evento";
    $("#h-titulo").maxLength = habito ? 60 : tarea ? 120 : 200;
    $("#h-cats").setAttribute("aria-label", habito ? "Frecuencia" : tarea ? "Categoría" : "Calendario");
    $(".h-grupo").classList.toggle("hidden", habito);
    for (const f of document.querySelectorAll(".h-hora")) f.classList.toggle("oculta", tarea || todo);
    $("#h-fila-todo").classList.toggle("oculta", tarea);
    chipsCats();
  }

  /** Abre la hoja. opciones: { evento } para editar, { tipo: "tarea" }, { fecha } o { inicio } para crear. */
  async function abrirHoja(op = {}) {
    if (op.tipo === "habito") return abrirHabito(op.habito);
    if (!op.evento && op.tipo !== "tarea" && !ctx.sesion()) op = { ...op, tipo: "tarea" };
    if (op.evento && !(op.evento.id && op.evento.cal)) return aviso("Este evento no se puede editar desde aquí.");
    const e = op.evento;
    hoja = { tipo: e ? "evento" : op.tipo ?? "evento", evento: e ?? null };
    const base = op.fecha ? desdeClave(op.fecha) : cal.fecha;
    const ini = e ? (e.dia ? desdeClave(e.dia) : new Date(e.inicio))
      : op.inicio ?? new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.min(new Date().getHours() + 1, 23));
    const fin = e && !e.dia ? new Date(e.fin) : new Date(ini.getTime() + 3600000);
    $("#h-encabezado").textContent = e ? "Editar evento" : "";
    $("#h-tipo").classList.toggle("hidden", !!e);
    $("#h-titulo").value = e?.titulo ?? "";
    $("#h-todo").checked = !!e?.dia;
    $("#h-fecha").value = clave(op.tipo === "tarea" && !op.fecha ? (visible() ? cal.fecha : new Date()) : ini);
    $("#h-ini").value = horaTxt(ini);
    $("#h-fin").value = horaTxt(fin);
    $("#h-borrar").classList.toggle("hidden", !e);
    $("#h-borrar").textContent = "Borrar evento";
    ensenar(!e);
    if (hoja.tipo === "evento" && !calendarios) {
      try { await cargarCalendarios(); if (hoja.tipo === "evento") chipsCats(); }
      catch { $("#h-msg").textContent = "No se pudo conectar con Google Calendar."; }
    }
  }

  /** Prepara los campos comunes y muestra la hoja con su animación. */
  function ensenar(enfocar) {
    $("#h-msg").textContent = "";
    $("#h-guardar").disabled = false;
    ajustarHoja();
    const d = $("#hoja");
    d.classList.remove("cerrando");
    d.showModal();
    animar(d, "abre");
    if (enfocar && matchMedia("(hover: hover)").matches) $("#h-titulo").focus();
  }

  /** Hoja para crear (sin hábito) o editar un hábito: nombre y frecuencia. */
  function abrirHabito(h) {
    hoja = { tipo: "habito", habito: h ?? null };
    $("#h-encabezado").textContent = h ? "Editar hábito" : "Nuevo hábito";
    $("#h-tipo").classList.add("hidden");
    $("#h-titulo").value = h?.nombre ?? "";
    $("#h-borrar").classList.toggle("hidden", !h);
    $("#h-borrar").textContent = "Borrar hábito";
    ensenar(!h);
  }

  function cerrarHoja() {
    const d = $("#hoja");
    if (!d.open || d.classList.contains("cerrando")) return;
    if (sinMovimiento()) return d.close();
    d.classList.add("cerrando");
    d.addEventListener("animationend", () => { d.classList.remove("cerrando"); d.close(); }, { once: true });
  }

  async function guardarHoja(accion) {
    const k = $("#h-fecha").value, titulo = $("#h-titulo").value.trim();
    const elegido = $("#h-cats [aria-pressed=true]")?.dataset.valor ?? "";
    if (hoja.tipo === "habito") {
      if (accion === "borrar") ctx.borrarHabito(hoja.habito);
      else if (!titulo) { $("#h-titulo").focus(); animar($("#h-titulo"), "sacude"); return; }
      else ctx.guardarHabito(hoja.habito, titulo.slice(0, 60), Number(elegido) || 7);
      cerrarHoja();
      aviso(accion === "borrar" ? "Hábito borrado" : hoja.habito ? "Hábito actualizado" : "Hábito añadido");
      return;
    }
    if (accion !== "borrar" && (!titulo || !FECHA.test(k))) { $("#h-titulo").focus(); animar($("#h-titulo"), "sacude"); return; }
    if (hoja.tipo === "tarea") {
      ctx.anadirTarea({ id: crypto.randomUUID(), texto: titulo.slice(0, 120), fecha: k, hecha: false,
        ...(CATEGORIAS.some((c) => c.id === elegido) && { categoria: elegido }) });
      cerrarHoja();
      aviso("Tarea añadida");
      return;
    }
    if (!elegido && accion !== "borrar") return ($("#h-msg").textContent = "Elige un calendario.");
    const e = hoja.evento, p = { accion, cal: e?.cal ?? elegido };
    if (accion !== "borrar") {
      p.titulo = titulo.slice(0, 200);
      if ($("#h-todo").checked) {
        const dias = e?.dia && e.diaFin ? Math.max(1, Math.round((desdeClave(e.diaFin) - desdeClave(e.dia)) / 86400000)) : 1;
        Object.assign(p, { dia: k, diaFin: clave(sumarDias(desdeClave(k), dias)) });
      } else {
        const i = enFecha(k, $("#h-ini").value || "09:00");
        let f = enFecha(k, $("#h-fin").value || "10:00");
        if (f <= i) f = sumarDias(f, 1); // termina pasada la medianoche
        Object.assign(p, { inicio: i.toISOString(), fin: f.toISOString() });
      }
    }
    if (e) Object.assign(p, { id: e.id, original: e.dia ?? e.inicio });
    $("#h-guardar").disabled = true;
    $("#h-msg").textContent = accion === "borrar" ? "Borrando…" : "Guardando en Google Calendar…";
    const { data, error } = await google(p);
    if (error || data?.error) {
      $("#h-guardar").disabled = false;
      $("#h-msg").textContent = "No se pudo guardar. Revisa la conexión e inténtalo otra vez.";
      return;
    }
    if (!e) ultimoCal = p.cal;
    cerrarHoja();
    aviso(accion === "borrar" ? "Evento borrado" : e ? "Evento actualizado" : "Evento creado");
    // Recarga los meses afectados.
    for (const d of [cal.fecha, desdeClave(k)]) cal.meses.delete(claveMes(d));
    cargarMes(cal.fecha, false);
    if (claveMes(desdeClave(k)) !== claveMes(cal.fecha)) cargarMes(desdeClave(k), false);
    ctx.alCambiarEventos();
  }

  // Arrastrar la hoja hacia abajo la cierra.
  function hojaArrastrable() {
    const d = $("#hoja"), asa = $("#hoja .hoja-top");
    let y0 = null, dy = 0;
    asa.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    asa.addEventListener("touchmove", (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      d.style.transition = "none";
      d.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    asa.addEventListener("touchend", () => {
      d.style.transition = "";
      d.style.transform = "";
      if (dy > 110) cerrarHoja();
      y0 = null;
    });
  }

  // ---------- Eventos de la interfaz ----------
  for (const b of document.querySelectorAll("#cal-seg [data-modo]")) b.addEventListener("click", () => {
    if (b.dataset.modo === cal.modo) return;
    if (b.dataset.modo === "dia") irADia(cal.fecha, $(`#cal .casilla[data-k="${clave(cal.fecha)}"]`)); else irAMes();
  });
  $("#cal-prev").addEventListener("click", () => (cal.modo === "mes" ? cambiarMes(-1) : cambiarDia(sumarDias(cal.fecha, -1))));
  $("#cal-next").addEventListener("click", () => (cal.modo === "mes" ? cambiarMes(1) : cambiarDia(sumarDias(cal.fecha, 1))));
  $("#cal-hoy").addEventListener("click", () => {
    const hoy = new Date();
    if (cal.modo === "dia") return cambiarDia(hoy);
    if (claveMes(hoy) !== claveMes(cal.fecha)) return cambiarMes(hoy > cal.fecha ? 1 : -1, hoy);
    cal.fecha = hoy;
    refrescar();
    animar($("#cal .panel .p-lista"), "panel-entra");
  });
  $("#cal-nuevo").addEventListener("click", () => abrirHoja({}));
  for (const b of document.querySelectorAll("#h-tipo [data-modo]")) b.addEventListener("click", () => { hoja.tipo = b.dataset.modo; ajustarHoja(); });
  $("#h-todo").addEventListener("change", ajustarHoja);
  $("#h-cerrar").addEventListener("click", cerrarHoja);
  $("#hoja").addEventListener("cancel", (e) => { e.preventDefault(); cerrarHoja(); });
  $("#hoja").addEventListener("click", (e) => { if (e.target === $("#hoja")) cerrarHoja(); }); // toque fuera (fondo)
  $("#h-borrar").addEventListener("click", () => {
    const pregunta = hoja.tipo === "habito" ? `¿Borrar «${hoja.habito.nombre}» y todo su historial?` : `¿Borrar «${hoja.evento.titulo}» de Google Calendar?`;
    if (confirm(pregunta)) guardarHoja("borrar");
  });
  $("#hoja-form").addEventListener("submit", (e) => { e.preventDefault(); guardarHoja(hoja.evento || hoja.habito ? "editar" : "crear"); });
  hojaArrastrable();

  return {
    /** Al entrar en la pestaña. */
    mostrar: render,
    refrescar,
    abrirHoja,
    /** Olvida los eventos guardados (al volver a la app o al cerrar sesión). */
    limpiar: () => { cal.meses.clear(); calendarios = null; },
  };
}
