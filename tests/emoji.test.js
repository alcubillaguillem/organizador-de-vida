import { test } from "node:test";
import assert from "node:assert/strict";
import { emojiDe } from "../emoji.js";

test("asocia el emoji por palabra clave, sin tildes ni mayúsculas", () => {
  assert.equal(emojiDe("Ir al Gimnasio"), "🏋️");
  assert.equal(emojiDe("Rezar el rosario"), "📿");
  assert.equal(emojiDe("Leer 20 minutos"), "📚");
  assert.equal(emojiDe("Confesión"), "🙏");
  assert.equal(emojiDe("Beber 2 L de agua"), "💧");
  assert.equal(emojiDe("Dormir 8 horas"), "😴");
});

test("emoji por defecto si no hay coincidencia", () => {
  assert.equal(emojiDe("Algo raro"), "⭐");
});
