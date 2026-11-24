import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { eventosEntre, ordenar } from "../supabase/functions/calendario/eventos.js";

// ical.js es dependencia de desarrollo: `npm install` antes de `npm test`.
let ICAL;
try { ICAL = createRequire(import.meta.url)("ical.js"); } catch { ICAL = null; }

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Clases
BEGIN:VTIMEZONE
TZID:Europe/Sofia
BEGIN:STANDARD
DTSTART:19701025T040000
TZOFFSETFROM:+0300
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T030000
TZOFFSETFROM:+0200
TZOFFSETTO:+0300
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:clase
SUMMARY:Clase de redes
DTSTART;TZID=Europe/Sofia:20261103T090000
DTEND;TZID=Europe/Sofia:20261103T103000
RRULE:FREQ=WEEKLY;BYDAY=TU
END:VEVENT
BEGIN:VEVENT
UID:clase
RECURRENCE-ID;TZID=Europe/Sofia:20261117T090000
SUMMARY:Clase de redes (aula 2)
DTSTART;TZID=Europe/Sofia:20261117T110000
DTEND;TZID=Europe/Sofia:20261117T120000
END:VEVENT
BEGIN:VEVENT
UID:cumple
SUMMARY:Cumpleaños de Ana
DTSTART;VALUE=DATE:20261124
DTEND;VALUE=DATE:20261125
END:VEVENT
BEGIN:VEVENT
UID:otro
SUMMARY:Ayer
DTSTART:20261123T150000Z
DTEND:20261123T160000Z
END:VEVENT
END:VCALENDAR`.replace(/\n/g, "\r\n");

test("eventos de un día: recurrentes, todo el día y zona horaria", { skip: !ICAL }, () => {
  const ini = new Date("2026-11-23T22:00:00Z"), fin = new Date("2026-11-24T22:00:00Z"); // 24 nov en Sofía
  assert.deepEqual(ordenar(eventosEntre(ICAL, ICS, ini, fin)), [
    { titulo: "Cumpleaños de Ana", calendario: "Clases", dia: "2026-11-24" },
    { titulo: "Clase de redes", calendario: "Clases", inicio: "2026-11-24T07:00:00.000Z", fin: "2026-11-24T08:30:00.000Z" },
  ]);
});

test("una excepción de la serie cambia hora y título", { skip: !ICAL }, () => {
  const ini = new Date("2026-11-16T22:00:00Z"), fin = new Date("2026-11-17T22:00:00Z");
  assert.deepEqual(eventosEntre(ICAL, ICS, ini, fin), [
    { titulo: "Clase de redes (aula 2)", calendario: "Clases", inicio: "2026-11-17T09:00:00.000Z", fin: "2026-11-17T10:00:00.000Z" },
  ]);
});
