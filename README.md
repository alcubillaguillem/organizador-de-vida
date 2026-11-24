# Organizador de vida

App web instalable (PWA) para el iPhone y el ordenador. Mismo enfoque que Gastos Erasmus: sin compilación, se sirve tal cual desde GitHub Pages y se añade a la pantalla de inicio.

- `index.html`, `styles.css`, `app.js`: la app.
- `stats.js`: rachas y porcentajes del habit tracker. Tests: `npm test` (Node 22).
- `emoji.js`: emoji automático según el nombre del hábito (mapa de palabras clave).
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y uso sin conexión.
- `config.js`: URL y clave publicable de Supabase (pública).
- `vendor/supabase-js-2.117.3.js`: cliente de Supabase servido desde la app.
- `vendor/fonts/`: Inter y Space Grotesk (licencia SIL OFL), servidas desde la propia app.

Los hábitos se sincronizan con Supabase (proyecto de Gastos Erasmus, mismo login). Tabla y seguridad en `supabase/habitos.sql`. Con `config.js` vacío, la app funciona en modo local.

Probar en local: `python3 -m http.server` en esta carpeta y abrir http://localhost:8000.
