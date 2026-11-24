# Organizador de vida

App web instalable (PWA) para el iPhone y el ordenador. Mismo enfoque que Gastos Erasmus: sin compilación, se sirve tal cual desde GitHub Pages y se añade a la pantalla de inicio.

- `index.html`, `styles.css`, `app.js`: la app.
- `stats.js`: rachas y porcentajes del habit tracker. Tests: `npm test` (Node 22).
- `categorias.js`: categorías de la agenda (coinciden con los calendarios de Google).
- `agenda.js`: cálculos de la pestaña Calendario (rejilla del mes, eventos de un día, solapes).
- `emoji.js`: emoji automático según el nombre del hábito (mapa de palabras clave).
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y uso sin conexión.
- `config.js`: URL y clave publicable de Supabase (pública).
- `vendor/supabase-js-2.117.3.js`: cliente de Supabase servido desde la app.
- `vendor/fonts/`: Inter y Space Grotesk (licencia SIL OFL), servidas desde la propia app.

Los hábitos se sincronizan con Supabase (proyecto de Gastos Erasmus, mismo login). Tabla y seguridad en `supabase/habitos.sql`. Con `config.js` vacío, la app funciona en modo local.

Probar en local: `python3 -m http.server` en esta carpeta y abrir http://localhost:8000.

## Google Calendar

La app habla con `supabase/functions/calendario` (slug `quick-handler`), que solo responde a `CALENDARIO_USER_ID` y reenvía la petición validada a un Apps Script de tu cuenta (`google/Codigo.gs`). Secretos de la función: `CALENDARIO_USER_ID`, `GOOGLE_SCRIPT_URL` y `GOOGLE_SCRIPT_CLAVE`. La clave se crea con `crearClave()` dentro del script y nunca llega al navegador.
