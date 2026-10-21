# Chrono

Chrono de séance sportive (PWA, pensée pour un téléphone Android) : AMRAP, EMOM, For Time, Tabata, intervalles, chrono, compte à rebours, étapes personnalisées, musculation et course. On prépare ses séances, on les planifie, l'app guide au bip et à la voix, et on garde un historique. **100 % local** : pas de compte, pas de serveur, tout reste sur le téléphone.

- Plan fonctionnel : [docs/PLAN.md](docs/PLAN.md)
- Choix de design : [docs/DESIGN.md](docs/DESIGN.md)

## Installer l'app sur le téléphone

Chrono est une PWA : une app web qui s'installe sur l'écran d'accueil et marche hors-ligne.

1. Mettre l'app en ligne (une seule fois) :
   - **GitHub Pages** : rendre le dépôt public, puis **Settings › Pages › Source : GitHub Actions**. L'app sera sur `https://<compte>.github.io/chrono/` et se met à jour à chaque push sur `main`.
   - ou **Netlify / Cloudflare Pages** (le dépôt peut rester privé) : relier le dépôt, commande `npm run build`, dossier `dist`.
2. Sur le téléphone, ouvrir l'adresse dans Chrome, puis menu ⋮ › **Ajouter à l'écran d'accueil**.

Les rappels de séance ne s'affichent que si Chrono est ouvert (limite des navigateurs). Au premier rappel, autoriser les notifications.

## Travailler sur le code

Prérequis : [Node.js 20+](https://nodejs.org) et Git.

```bash
git clone https://github.com/<compte>/chrono.git
cd chrono
npm install
npm run dev          # app en local sur http://localhost:5173
npm test             # tests unitaires (moteur de chrono, planning, stockage…)
npm run test:e2e     # parcours dans un navigateur (Playwright ; d'abord : npx playwright install chromium)
npm run build        # version de production dans dist/
```

Pour tester sur le téléphone pendant le développement : `npm run dev -- --host`, puis ouvrir l'adresse affichée (même Wi-Fi).

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/engine/` | Moteur de chrono pur et testé : `phases.ts` (séance → phases), `timer.ts` (états, pause, passer), `cues.ts` (bips et annonces programmés à l'avance), `session.ts` (séance en cours) |
| `src/data/` | Types, stockage IndexedDB (Dexie), planification, partage par lien, WOD connus, sauvegarde |
| `src/audio/` | Sons synthétisés (Web Audio) et voix française |
| `src/screens/` | Écrans : Accueil, Planning, Séances (bibliothèque, historique, WOD), Éditeur, Chrono, Résultat, Réglages |
| `src/ui/` | Composants communs et icônes |
| `tests/e2e/` | Parcours Playwright |
| `.github/workflows/` | Tests à chaque push ; déploiement Pages si le dépôt est public |
