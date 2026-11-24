// Saca los eventos de un calendario iCal (texto .ics) que caen entre `ini` y `fin` (Date).
// Expande eventos recurrentes y respeta las zonas horarias del propio calendario.
// Recibe ICAL (la librería ical.js) como parámetro para poder probarlo fuera de Supabase.
export function eventosEntre(ICAL, ics, ini, fin) {
  const cal = new ICAL.Component(ICAL.parse(ics));
  const calendario = String(cal.getFirstPropertyValue("x-wr-calname") ?? "").slice(0, 60);
  for (const tz of cal.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const vevents = cal.getAllSubcomponents("vevent");
  const excepciones = vevents.filter((v) => v.hasProperty("recurrence-id"));
  const eventos = [];
  const anadir = (titulo, inicio, final) => {
    const s = inicio.toJSDate(), e = final.toJSDate();
    if (e > ini && s < fin) {
      eventos.push(inicio.isDate
        ? { titulo, calendario, dia: inicio.toString(), diaFin: final.toString() }
        : { titulo, calendario, inicio: s.toISOString(), fin: e.toISOString() });
    }
  };

  for (const v of vevents) {
    if (v.hasProperty("recurrence-id")) continue;
    const ev = new ICAL.Event(v);
    if (v.getFirstPropertyValue("status") === "CANCELLED") continue;
    if (!ev.isRecurring()) { anadir(ev.summary, ev.startDate, ev.endDate); continue; }
    for (const x of excepciones) if (x.getFirstPropertyValue("uid") === ev.uid) ev.relateException(x);
    const it = ev.iterator();
    for (let t = it.next(), n = 0; t && t.toJSDate() < fin && n < 5000; t = it.next(), n++) {
      const o = ev.getOccurrenceDetails(t);
      if (o.item.component.getFirstPropertyValue("status") !== "CANCELLED") anadir(o.item.summary, o.startDate, o.endDate);
    }
  }
  return eventos.map((e) => ({ ...e, titulo: String(e.titulo ?? "(sin título)").slice(0, 200) }));
}

/** Ordena: primero los de todo el día, luego por hora de inicio. */
export const ordenar = (eventos) =>
  eventos.sort((a, b) => (a.dia ? 0 : 1) - (b.dia ? 0 : 1) || (a.inicio ?? "").localeCompare(b.inicio ?? ""));
