# Pulse — consignes pour Claude

**Pulse** (anciennement Chrono ; slogan « Un peu Pulse chaque jour ») : chrono de séance sportive et jeux de société sportifs. PWA installable, 100 % locale, en français. Le dépôt s’appelle toujours `chrono`, et « Chrono » reste le nom du mode chrono libre.
Le propriétaire de l'app est Eric ; il écrit en français : réponds en français. Il utilise un iPhone.

- Plan validé : `docs/PLAN.md` (dont la liste « Reste à faire »). Design validé : `docs/DESIGN.md`. Les respecter, et les mettre à jour dans le même commit qu’un changement qui les concerne.
- Stack : React 18 + TypeScript + Vite + vite-plugin-pwa, Dexie (IndexedDB). Pas de backend, pas de compte, pas d’app native (APK abandonné) : ne pas en ajouter.
- Les moteurs (`src/engine/`, `src/game/`, `src/games/`) sont purs et couverts par Vitest : toute modification d’un moteur s'accompagne de tests.
- Avant de pousser : `npm test`, `npm run build` (inclut `tsc`), et si l'interface change `npm run test:e2e`.
- Le temps est toujours calculé depuis l'heure de début de phase (jamais en comptant des ticks).
- Textes de l'interface en français, typographie française (apostrophe ’, espaces).
- Le CI (`.github/workflows/ci.yml`) lance les tests et le build à chaque push ; `pages.yml` publie la PWA sur GitHub Pages.
- Annonces vocales enregistrées : après un ajout de phrase dans `src/engine/cues.ts` ou d'exercice, régénérer avec `scripts/voix/generer.py` (Piper + voix fr_FR-siwis-medium, ffmpeg).
- Logo : `scripts/logo-pulse.webp` ; icônes générées par `scripts/icons.mjs`.
