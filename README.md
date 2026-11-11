# Pulse

*Un peu Pulse chaque jour.*

Chrono de séance sportive, sous forme de PWA (app web installable sur iPhone ou Android). On prépare ses séances, on les planifie, l’app guide au bip et à la voix, et on garde un historique. Elle contient aussi des jeux de société sportifs. **100 % local** : pas de compte, pas de serveur, tout reste sur le téléphone.

Le dépôt garde son ancien nom, `chrono`. Dans l’app, « Chrono » ne désigne plus que le mode chronomètre libre.

| Document | Contenu |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Ce que fait l’app, les décisions prises, ce qui reste à faire |
| [docs/DESIGN.md](docs/DESIGN.md) | Couleurs, mise en page des écrans |
| [CLAUDE.md](CLAUDE.md) | Consignes de travail pour Claude |

## Installer l’app sur le téléphone

L’app est publiée par GitHub Pages sur `https://<compte>.github.io/chrono/` et se met à jour à chaque push sur `main` (le dépôt doit rester public).

- **iPhone** : ouvrir l’adresse dans Safari, bouton Partager, puis **Sur l’écran d’accueil**.
- **Android** : ouvrir l’adresse dans Chrome, menu ⋮, puis **Ajouter à l’écran d’accueil**.

Une mise à jour s’installe en fermant puis rouvrant l’app (deux fois si besoin). Elle n’est jamais appliquée pendant une séance.

## Travailler sur le code

Prérequis : [Node.js 20+](https://nodejs.org) et Git.

```bash
npm install
npm run dev          # app en local sur http://localhost:5173
npm test             # tests unitaires (Vitest)
npm run test:e2e     # parcours dans un navigateur (Playwright)
npm run build        # vérification TypeScript + version de production dans dist/
```

Pour tester sur le téléphone pendant le développement : `npm run dev -- --host`, puis ouvrir l’adresse affichée (même Wi-Fi).

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/engine/` | Moteur pur et testé : `phases.ts` (séance → phases), `timer.ts` (états, pause, passer, ajout d’étape), `cues.ts` (bips et annonces), `timeline.ts` (créateur de séance), `session.ts` (séance en cours, liaison avec le son) |
| `src/audio/` | Bips (Web Audio), annonces enregistrées, piste pour le son en arrière-plan |
| `src/data/` | Types, stockage IndexedDB (Dexie), planification, partage par lien, WOD connus |
| `src/anim/` | Avatar animé et exercices |
| `src/game/` | Moteur de Pulse Poly |
| `src/games/` | Logique des autres jeux (bataille navale, jeu de l’oie, mémo, roue de la santé) |
| `src/screens/` | Écrans |
| `src/ui/` | Composants communs et icônes |
| `tests/e2e/` | Parcours Playwright |
| `scripts/` | Génération des icônes (`icons.mjs`) et des annonces vocales (`voix/generer.py`) |
| `.github/workflows/` | `ci.yml` : tests et build à chaque push ; `pages.yml` : publication sur GitHub Pages |
