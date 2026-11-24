# Organizador de vida

App web instalable (PWA) para el iPhone y el ordenador. Mismo enfoque que Gastos Erasmus: sin compilación, se sirve tal cual desde GitHub Pages y se añade a la pantalla de inicio.

- `index.html`, `styles.css`, `app.js`: la app.
- `stats.js`: rachas y porcentajes del habit tracker. Tests: `npm test` (Node 22).
- `sw.js`, `manifest.webmanifest`, `icons/`: instalación y uso sin conexión.
- `vendor/fonts/`: Inter y Space Grotesk (licencia SIL OFL), servidas desde la propia app.

Los hábitos se guardan solo en este navegador (localStorage). La sincronización entre dispositivos llegará con Supabase.

Probar en local: `python3 -m http.server` en esta carpeta y abrir http://localhost:8000.
