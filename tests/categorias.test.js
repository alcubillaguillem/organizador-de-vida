import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaDe, agrupar } from "../categorias.js";

test("asigna la categoría por el nombre del calendario", () => {
  assert.equal(categoriaDe("Clases").emoji, "🎓");
  assert.equal(categoriaDe("Clases universidad").id, "clases");
  assert.equal(categoriaDe("ESPIRITUALIDAD").id, "espiritualidad");
  assert.equal(categoriaDe("Familia").nombre, "Familia");
  assert.equal(categoriaDe(undefined).nombre, "Otros");
});

test("agrupa en el orden fijo de categorías", () => {
  const ev = [{ c: "Ocio" }, { c: "Clases" }, { c: "Familia" }, { c: "Clases" }];
  assert.deepEqual(agrupar(ev, (e) => e.c).map((g) => [g.nombre, g.items.length]), [["Clases", 2], ["Ocio", 1], ["Familia", 1]]);
});
