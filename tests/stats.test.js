import { test } from "node:test";
import assert from "node:assert/strict";
import { clave, sumarDias, rachaActual, mejorRacha, tasaSemanal, tasaDia } from "../stats.js";

const hoy = new Date(2026, 10, 24, 10);
const hace = (...n) => n.map((i) => clave(sumarDias(hoy, -i)));

test("racha actual cuenta desde ayer si hoy falta", () => {
  assert.equal(rachaActual(hace(1, 2, 3, 5), hoy), 3);
  assert.equal(rachaActual(hace(0, 1), hoy), 2);
  assert.equal(rachaActual(hace(2), hoy), 0);
});

test("mejor racha, también cruzando de mes", () => {
  assert.equal(mejorRacha(hace(0, 1, 5, 6, 7, 7)), 3);
  assert.equal(mejorRacha(["2026-10-31", "2026-11-01", "2026-11-02"]), 3);
  assert.equal(mejorRacha([]), 0);
});

test("tasa semanal respeta la fecha de creación", () => {
  assert.equal(tasaSemanal({ creado: hace(1)[0], dias: hace(0) }, hoy), 0.5);
  assert.equal(tasaSemanal({ creado: hace(30)[0], dias: hace(0, 1, 2, 3, 4, 5, 6) }, hoy), 1);
});

test("tasa de un día ignora hábitos aún no creados", () => {
  const k = hace(3)[0];
  const habitos = [{ creado: hace(10)[0], dias: [k] }, { creado: hace(1)[0], dias: [] }];
  assert.equal(tasaDia(habitos, k), 1);
  assert.equal(tasaDia([], k), null);
});
