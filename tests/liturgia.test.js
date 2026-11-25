import { test } from "node:test";
import assert from "node:assert/strict";
import { limpiar, HORAS } from "../supabase/functions/liturgia/limpiar.js";

const PAGINA = `<html><body><div id="menu_bar"><a href="x">Breviario</a></div>
<div id="contenuto"><div class="inner"><h1>Breviario</h1>
<p><span class="sezione">Vísperas</span></p>
<p><span class="rubrica">V.</span>&nbsp;Dios m&iacute;o, ven en mi auxilio.<br /><span class="rubrica">R. </span>Se&ntilde;or, date prisa.</p>
<p class="rubrica">HIMNO</p>
<p><span class="rubrica">Salmo 61<br />DIOS, &Uacute;NICA ESPERANZA<br /></span><span class="commenti">(Rom 15, 13).</span></p>
<p><span style="color: #dc2300;">RESPONSORIO BREVE</span></p>
<p><span class="rubrica"><span class="rubrica">Ant.&nbsp;</span></span>Aclama al Se&ntilde;or.<script>alert(1)</script></p>
<p><a href="#menu">- Menú -</a></p>
</div><script src="http://x"></script></div></body></html>`;

test("convierte la página en párrafos de texto con rúbricas", () => {
  const r = limpiar(PAGINA);
  assert.equal(r.titulo, "Vísperas");
  assert.deepEqual(r.parrafos[0], [["V.", true], [" Dios mío, ven en mi auxilio.\n", false], ["R. ", true], ["Señor, date prisa.", false]]);
  assert.deepEqual(r.parrafos[1], [["HIMNO", true]]);
  assert.deepEqual(r.parrafos[2], [["Salmo 61\nDIOS, ÚNICA ESPERANZA\n", true], ["(Rom 15, 13).", false]]);
  assert.deepEqual(r.parrafos[3], [["RESPONSORIO BREVE", true]]);
  assert.deepEqual(r.parrafos[4], [["Ant. ", true], ["Aclama al Señor.", false]]);
  assert.equal(r.parrafos.length, 5);
});

test("sin contenido o forma rara: null", () => {
  assert.equal(limpiar("<html></html>"), null);
  assert.equal(limpiar(null), null);
  assert.ok(HORAS.includes("lodi") && !HORAS.includes("../x"));
});
