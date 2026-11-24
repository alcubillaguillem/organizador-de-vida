// Organizador de vida: puente con tu Google Calendar.
// Se pega en script.google.com y se publica como "Aplicación web" (ejecutar como: yo; acceso: cualquier usuario).
// Solo responde si la petición trae la CLAVE secreta, que vive en las propiedades del script y en Supabase.

/** Ejecuta esta función una vez (botón ▶). Crea la clave y la muestra en el registro para copiarla en Supabase. */
function crearClave() {
  const clave = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty("CLAVE", clave);
  console.log("GOOGLE_SCRIPT_CLAVE = " + clave);
}

function doPost(e) {
  let r;
  try {
    const p = JSON.parse(e.postData.contents);
    const clave = PropertiesService.getScriptProperties().getProperty("CLAVE");
    if (!clave || clave.length < 32 || p.clave !== clave) r = { error: "no autorizado" };
    else if (!ACCIONES.hasOwnProperty(p.accion)) r = { error: "acción desconocida" };
    else r = ACCIONES[p.accion](p);
  } catch (err) {
    r = { error: String((err && err.message) || err).slice(0, 200) };
  }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

const TZ = () => Session.getScriptTimeZone();
const dia = (d) => Utilities.formatDate(d, TZ(), "yyyy-MM-dd");
const fecha = (k) => Utilities.parseDate(k, TZ(), "yyyy-MM-dd");

function calendario(id) {
  const c = CalendarApp.getCalendarById(id);
  if (!c || !c.isOwnedByMe()) throw new Error("calendario no encontrado");
  return c;
}

function evento(c, ev) {
  const base = { id: ev.getId(), cal: c.getId(), titulo: ev.getTitle(), calendario: c.getName() };
  if (ev.isAllDayEvent()) return Object.assign(base, { dia: dia(ev.getAllDayStartDate()), diaFin: dia(ev.getAllDayEndDate()) });
  return Object.assign(base, { inicio: ev.getStartTime().toISOString(), fin: ev.getEndTime().toISOString() });
}

/** La aparición concreta de un evento (en las series, cada día es una aparición distinta). */
function buscar(c, p) {
  const ini = p.original.length === 10 ? fecha(p.original) : new Date(p.original);
  const lista = c.getEvents(new Date(ini.getTime() - 86400000), new Date(ini.getTime() + 2 * 86400000));
  const ev = lista.find((x) => x.getId() === p.id &&
    (x.isAllDayEvent() ? dia(x.getAllDayStartDate()) === p.original : x.getStartTime().getTime() === ini.getTime()));
  if (!ev) throw new Error("evento no encontrado");
  return ev;
}

function fijarHora(ev, p) {
  if (p.dia) ev.setAllDayDates(fecha(p.dia), fecha(p.diaFin));
  else ev.setTime(new Date(p.inicio), new Date(p.fin));
}

const ACCIONES = {
  calendarios: () => ({ calendarios: CalendarApp.getAllOwnedCalendars().map((c) => ({ id: c.getId(), nombre: c.getName() })) }),
  listar: (p) => {
    const a = new Date(p.desde), b = new Date(p.hasta);
    return { eventos: CalendarApp.getAllOwnedCalendars().reduce((todos, c) => todos.concat(c.getEvents(a, b).map((ev) => evento(c, ev))), []) };
  },
  crear: (p) => {
    const c = calendario(p.cal);
    const ev = p.dia ? c.createAllDayEvent(p.titulo, fecha(p.dia), fecha(p.diaFin)) : c.createEvent(p.titulo, new Date(p.inicio), new Date(p.fin));
    return { evento: evento(c, ev) };
  },
  editar: (p) => {
    const c = calendario(p.cal), ev = buscar(c, p);
    ev.setTitle(p.titulo);
    fijarHora(ev, p);
    return { evento: evento(c, ev) };
  },
  borrar: (p) => {
    buscar(calendario(p.cal), p).deleteEvent();
    return { ok: true };
  },
};
