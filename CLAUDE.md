# Chrono — consignes pour Claude

App de chrono de séance sportive (PWA installable), 100 % locale, en français.
Le propriétaire de l'app est Eric ; il écrit en français : réponds en français.

- Plan validé : `docs/PLAN.md` (dont la liste « Reste à faire »). Design validé : `docs/DESIGN.md`. Les respecter.
- Stack : React 18 + TypeScript + Vite + vite-plugin-pwa, Dexie (IndexedDB). Pas de backend, pas de compte, pas d’app native (APK abandonné) : ne pas en ajouter.
- Le moteur (`src/engine/`) est pur et couvert par Vitest : toute modification du moteur s'accompagne de tests.
- Avant de pousser : `npm test`, `npm run build` (inclut `tsc`), et si l'interface change `npm run test:e2e`.
- Le temps est toujours calculé depuis l'heure de début de phase (jamais en comptant des ticks).
- Textes de l'interface en français, typographie française (apostrophe ’, espaces).
- Le CI (`.github/workflows/ci.yml`) lance les tests et le build à chaque push ; `pages.yml` publie la PWA sur GitHub Pages si le dépôt est public.
