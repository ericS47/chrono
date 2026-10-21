# Chrono — consignes pour Claude

App de chrono de séance sportive (PWA + APK Android via Capacitor), 100 % locale, en français.
Le propriétaire de l'app est Eric ; il écrit en français : réponds en français.

- Plan validé : `docs/PLAN.md` (dont la liste « Reste à faire »). Design validé : `docs/DESIGN.md`. Les respecter.
- Stack : React 18 + TypeScript + Vite + vite-plugin-pwa, Dexie (IndexedDB), Capacitor 6 (`@capacitor/local-notifications`). Pas de backend, pas de compte : ne pas en ajouter.
- Le moteur (`src/engine/`) est pur et couvert par Vitest : toute modification du moteur s'accompagne de tests.
- Avant de pousser : `npm test`, `npm run build` (inclut `tsc`), et si l'interface change `npm run test:e2e`.
- Le temps est toujours calculé depuis l'heure de début de phase (jamais en comptant des ticks).
- Textes de l'interface en français, typographie française (apostrophe ’, espaces).
- Le CI (`.github/workflows/ci.yml`) publie l'APK dans la release `latest` à chaque push sur `main`.
