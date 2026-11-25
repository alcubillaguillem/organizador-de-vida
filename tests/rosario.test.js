import { test } from "node:test";
import assert from "node:assert/strict";
import { MISTERIOS, misteriosDe, ORACIONES } from "../rosario.js";

test("misterios según el día de la semana", () => {
  // 2026-11-23 es lunes
  const dia = (n) => misteriosDe(new Date(2026, 10, 23 + n));
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(dia),
    ["gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos", "gloriosos"]);
});

test("4 series de 5 misterios y una sola sección de misterios", () => {
  assert.equal(MISTERIOS.length, 4);
  assert.ok(MISTERIOS.every((m) => m.lista.length === 5));
  assert.equal(ORACIONES.filter((o) => o.misterios).length, 1);
});
