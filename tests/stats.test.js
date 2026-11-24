import { test } from "node:test";
import assert from "node:assert/strict";
import { clave, sumarDias, rachaActual, mejorRacha, tasaSemanal, tasaDia, esDiario, hechosSemana, rachaSemanas, racha, mejor } from "../stats.js";

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

// 2026-11-24 es martes: la semana va del lunes 23 al domingo 29.
const semanal = (meta, ...n) => ({ meta, creado: hace(60)[0], dias: hace(...n) });

test("veces cumplidas solo cuentan la semana de lunes a domingo", () => {
  assert.equal(hechosSemana(hace(0, 1, 2, 3), hoy), 2);
});

test("racha semanal cuenta semanas con el objetivo cumplido", () => {
  // Semana actual: 2 de 2. Semana anterior (16-22): 2. La de antes (9-15): 1.
  const h = semanal(2, 0, 1, 2, 3, 9);
  assert.equal(rachaSemanas(h, hoy), 2);
  assert.equal(racha(h, hoy), 2);
  // Si esta semana aún no llega, cuenta desde la anterior.
  assert.equal(rachaSemanas(semanal(2, 0, 2, 3), hoy), 1);
});

test("mejor racha semanal y progreso de la semana", () => {
  assert.equal(mejor(semanal(1, 0, 7, 14, 28)), 3);
  assert.equal(tasaSemanal(semanal(5, 0, 1), hoy), 0.4);
  assert.equal(tasaSemanal(semanal(1, 0, 1), hoy), 1);
});

test("los hábitos semanales no cuentan en la tasa diaria", () => {
  const k = hace(0)[0];
  assert.equal(tasaDia([semanal(3, 0), { creado: hace(5)[0], dias: [] }], k), 0);
  assert.equal(esDiario({}), true);
  assert.equal(esDiario({ meta: 7 }), true);
  assert.equal(esDiario({ meta: 3 }), false);
});
