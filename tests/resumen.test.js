import { test } from "node:test";
import assert from "node:assert/strict";
import { limpiarResumen } from "../resumen.js";

test("se queda solo con los campos conocidos y recorta", () => {
  const r = limpiarResumen({
    dia: " Hoy: clase y misa ", extra: "<script>",
    correos: [{ de: "Uni", asunto: "Examen", resumen: "x".repeat(500), importante: true, html: "<b>" }, { de: "Vacío" }],
    evangelio: { cita: "Lc 21,5-11", texto: "Texto", reflexion: "Idea", enlace: "javascript:alert(1)" },
  });
  assert.equal(r.dia, "Hoy: clase y misa");
  assert.equal(r.correos.length, 1);
  assert.equal(r.correos[0].resumen.length, 400);
  assert.deepEqual(Object.keys(r.correos[0]), ["de", "asunto", "resumen", "importante"]);
  assert.equal(r.evangelio.enlace, "");
  assert.equal(r.extra, undefined);
});

test("nada útil o forma rara: null", () => {
  assert.equal(limpiarResumen(null), null);
  assert.equal(limpiarResumen("hola"), null);
  assert.equal(limpiarResumen({ correos: "x", evangelio: 3 }), null);
});
