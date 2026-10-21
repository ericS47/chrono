# Chrono

Chrono de séance sportive pour Android : AMRAP, EMOM, For Time, Tabata, intervalles, chrono, compte à rebours, étapes personnalisées, musculation et course. On prépare ses séances, on les planifie, l'app guide au bip et à la voix, et on garde un historique. **100 % local** : pas de compte, pas de serveur, tout reste sur le téléphone.

- Plan fonctionnel : [docs/PLAN.md](docs/PLAN.md)
- Choix de design : [docs/DESIGN.md](docs/DESIGN.md)

## Installer l'app sur le téléphone (APK)

À chaque mise à jour de la branche `main`, GitHub compile automatiquement l'APK Android.

1. Sur le téléphone, connecté à GitHub, ouvrir l'onglet **Releases** du dépôt, puis la release **latest**.
2. Télécharger **chrono.apk** et l'ouvrir. Android demande d'autoriser l'installation depuis le navigateur : accepter.
3. Pour mettre à jour, refaire pareil : la nouvelle version s'installe par-dessus, les données sont conservées.

Au premier lancement d'une séance planifiée avec rappel, autoriser les notifications.

> Version web (PWA) : si le dépôt devient public, activer **Settings › Pages › Source : GitHub Actions** ; l'app sera alors en ligne sur `https://<compte>.github.io/chrono/` et installable depuis Chrome (« Ajouter à l'écran d'accueil »). Netlify ou Cloudflare Pages marchent aussi (dossier `dist`, commande `npm run build`).

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

Pour tester sur le téléphone sans APK : `npm run dev -- --host`, puis ouvrir l'adresse affichée (même Wi-Fi).

### Compiler l'APK soi-même (optionnel)

GitHub le fait déjà. En local il faut [Android Studio](https://developer.android.com/studio) (avec le SDK Android 34 et Java 17) :

```bash
npm run cap:sync                 # build web + copie dans android/
npx cap open android             # ouvre Android Studio → Run ▶ sur le téléphone branché
# ou en ligne de commande : cd android && ./gradlew assembleDebug
```

## Organisation du code

| Dossier | Contenu |
|---|---|
| `src/engine/` | Moteur de chrono pur et testé : `phases.ts` (séance → phases), `timer.ts` (états, pause, passer), `cues.ts` (bips et annonces programmés à l'avance), `session.ts` (séance en cours) |
| `src/data/` | Types, stockage IndexedDB (Dexie), planification, partage par lien, WOD connus, sauvegarde |
| `src/audio/` | Sons synthétisés (Web Audio) et voix française |
| `src/screens/` | Écrans : Accueil, Planning, Séances (bibliothèque, historique, WOD), Éditeur, Chrono, Résultat, Réglages |
| `src/ui/` | Composants communs et icônes |
| `android/` | Projet Android Capacitor (notifications locales, écran allumé) |
| `tests/e2e/` | Parcours Playwright |
| `.github/workflows/` | Tests + APK à chaque push ; déploiement Pages si le dépôt est public |
