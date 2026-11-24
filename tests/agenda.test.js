import { test } from "node:test";
import assert from "node:assert/strict";
import { rejillaMes, mover, delDia, carriles } from "../agenda.js";
import { clave } from "../stats.js";

test("la rejilla del mes empieza en lunes y tiene 6 semanas", () => {
  const r = rejillaMes(new Date(2026, 10, 24)); // noviembre 2026 empieza en domingo
  assert.equal(r.length, 42);
  assert.equal(clave(r[0]), "2026-10-26");
  assert.equal(clave(r[41]), "2026-12-06");
});

test("mover por mes no se salta meses cortos", () => {
  assert.equal(clave(mover("mes", new Date(2026, 0, 31), 1)), "2026-02-28");
  assert.equal(clave(mover("semana", new Date(2026, 10, 24), -1)), "2026-11-17");
  assert.equal(clave(mover("dia", new Date(2026, 11, 31), 1)), "2027-01-01");
});

test("eventos del día: todo el día de varios días y horas recortadas", () => {
  const ev = [
    { titulo: "Viaje", dia: "2026-11-23", diaFin: "2026-11-26" },
    { titulo: "Cumple", dia: "2026-11-25" },
    { titulo: "Noche", inicio: new Date(2026, 10, 23, 22).toISOString(), fin: new Date(2026, 10, 24, 2).toISOString() },
    { titulo: "Clase", inicio: new Date(2026, 10, 24, 9).toISOString(), fin: new Date(2026, 10, 24, 10, 30).toISOString() },
  ];
  const d = delDia(ev, "2026-11-24");
  assert.deepEqual(d.todoDia.map((e) => e.titulo), ["Viaje"]);
  assert.deepEqual(d.conHora.map((e) => [e.titulo, e.desde, e.hasta]), [["Noche", 0, 120], ["Clase", 540, 630]]);
});

test("los eventos solapados van en columnas", () => {
  const r = carriles([{ desde: 0, hasta: 60 }, { desde: 30, hasta: 90 }, { desde: 60, hasta: 120 }, { desde: 200, hasta: 230 }]);
  assert.deepEqual(r.map((e) => [e.col, e.cols]), [[0, 2], [1, 2], [0, 2], [0, 1]]);
});
