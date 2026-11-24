import { test } from "node:test";
import assert from "node:assert/strict";
import { validar } from "../supabase/functions/calendario/validar.js";

const CAL = "abc123@group.calendar.google.com";

test("listar: rango de hasta 45 días", () => {
  assert.deepEqual(validar({ accion: "listar", desde: "2026-10-26T00:00:00Z", hasta: "2026-12-07T00:00:00Z", extra: 1 }),
    { accion: "listar", desde: "2026-10-26T00:00:00Z", hasta: "2026-12-07T00:00:00Z" });
  assert.equal(validar({ accion: "listar", desde: "2026-01-01T00:00:00Z", hasta: "2026-03-01T00:00:00Z" }), null);
});

test("crear: con hora o de todo el día, y nada más", () => {
  assert.deepEqual(validar({ accion: "crear", cal: CAL, titulo: " Gimnasio ", inicio: "2026-11-24T16:00:00.000Z", fin: "2026-11-24T17:00:00.000Z", clave: "x" }),
    { accion: "crear", cal: CAL, titulo: "Gimnasio", inicio: "2026-11-24T16:00:00.000Z", fin: "2026-11-24T17:00:00.000Z" });
  assert.deepEqual(validar({ accion: "crear", cal: CAL, titulo: "Viaje", dia: "2026-11-27", diaFin: "2026-11-30" }),
    { accion: "crear", cal: CAL, titulo: "Viaje", dia: "2026-11-27", diaFin: "2026-11-30" });
  assert.equal(validar({ accion: "crear", cal: CAL, titulo: "Al revés", inicio: "2026-11-24T17:00:00Z", fin: "2026-11-24T16:00:00Z" }), null);
  assert.equal(validar({ accion: "crear", cal: "mal'cal", titulo: "x", dia: "2026-11-27", diaFin: "2026-11-28" }), null);
  assert.equal(validar({ accion: "crear", cal: CAL, titulo: "", dia: "2026-11-27", diaFin: "2026-11-28" }), null);
});

test("editar y borrar necesitan id y fecha original", () => {
  const ed = { accion: "editar", cal: CAL, titulo: "Clase", inicio: "2026-11-24T09:00:00Z", fin: "2026-11-24T10:00:00Z", id: "uid@google.com", original: "2026-11-24T08:00:00.000Z" };
  assert.deepEqual(validar(ed), ed);
  assert.equal(validar({ ...ed, original: undefined }), null);
  assert.deepEqual(validar({ accion: "borrar", cal: CAL, id: "uid@google.com", original: "2026-11-24" }),
    { accion: "borrar", cal: CAL, id: "uid@google.com", original: "2026-11-24" });
  assert.equal(validar({ accion: "otra" }), null);
  assert.equal(validar(null), null);
});
