# Plan de Chrono (validé le 21/10/2026)

Résumé du plan fonctionnel validé avant le développement. Il remplace le document de travail d'origine.

## Vision

Une PWA installable sur le téléphone (Android) qui sert de chrono de séance : on prépare ses séances à l'avance, on les lance d'un tap, et l'app guide à la voix et au bip, même téléphone posé au sol. Inspirée de Smart WOD Timer, centrée sur trois choses : construire une séance, la planifier, garder une trace.

**Décisions fermes**

- 100 % local : aucun compte, aucun cloud ni synchro, pas de suivi cardio, pas de Google Fit / Health Connect, pas de montre, pas de partage social (le partage par lien/QR ne passe par aucun serveur).
- Écran maintenu allumé tant que l'app est ouverte (les sons écran verrouillé sont un bonus).
- En fin de séance : enregistrer ou non (réglage : toujours demander / toujours / jamais), plus nettoyage de l'historique ancien.
- Tous les types d'entraînement : CrossFit/HIIT, musculation, course (sans GPS), mobilité (mode Personnalisé).
- Préparation réglable de 0 à 60 s (défaut 10 s dans les réglages, modifiable par séance et juste avant de lancer).
- Contrôle complet du son.
- Rappels : notifications du navigateur, sans serveur ; elles ne s'affichent que si l'app est ouverte.
- PWA uniquement : l'APK Capacitor a été abandonné (décision du 21/10/2026).

## Modes de chrono (10)

| Mode | Principe | Paramètres |
|---|---|---|
| For Time | Finir au plus vite | Time cap optionnel ; chrono qui monte, bouton « Terminé », compteur de tours |
| AMRAP | Max de tours en un temps | Durée ; compteur de tours au tap |
| EMOM | Un travail chaque minute | Intervalle (E2MOM…), tours, exercices en alternance ou non |
| Tabata | 20 s / 10 s × 8 | Travail, repos, tours, séries, repos entre séries |
| Intervalles | Travail / repos sur mesure | Idem Tabata |
| Chrono | Chronomètre libre | Tours intermédiaires (laps) |
| Compte à rebours | Minuteur | Durée |
| Personnalisé | Suite libre d'étapes nommées | Étapes (nom, durée, effort/repos), répétitions |
| Musculation | Séries × reps, repos chronométré | Exercices, séries, reps, charge, repos ; bouton « Série terminée » |
| Course | Segments en durée | Segments (nom, durée, allure), répétitions |

Options communes : préparation, bips des dernières secondes (0 à 5), sons de début/fin de phase, mi-temps, annonces vocales (« Repos », « Tour 3 sur 8 », « 30 secondes »), vibration, pause / passer / revenir, grand affichage, mode paysage.

## Fonctionnalités

1. **Constructeur de séance** : une séance = suite de blocs (un mode + ses paramètres + des exercices détaillés nom/reps/charge), repos optionnel entre blocs, durée estimée, dupliquer / réordonner / supprimer un bloc.
2. **Bibliothèque** : mes séances (recherche, favoris, étiquettes), WOD connus pré-remplis (Cindy, Fran, Murph, Helen…), chrono rapide sans créer de séance, partage par lien ou QR code.
3. **Planification** : vue semaine/mois, séance à une date et une heure, récurrence hebdomadaire (jours + date de fin), écran Accueil avec la séance du jour (Démarrer, Décaler), rappel X minutes avant.
4. **Historique** : écran Résultat (temps For Time, tours + reps AMRAP, charges, RPE 1-10, note), saisie manuelle, historique par mois et par séance (comparer ses résultats), stats (séances/semaine, temps total, semaines actives de suite).
5. **Réglages** : sons (volumes général / bips / voix, son et activation par événement, bouton Tester, nombre de bips, mode silencieux), voix (phase, tour, temps restant), préparation par défaut, vibration, écran allumé, thème clair/sombre/système, mode d'enregistrement, export/import JSON, espace occupé, suppression auto de l'historique.

## Modèle de données (IndexedDB, voir `src/data/types.ts`)

- **Workout** : séance modèle (blocs, étiquettes, favori, préparation et son propres).
- **Block** : mode, paramètres, exercices, repos après.
- **ScheduledSession** : séance planifiée (date, heure, jours de récurrence, fin, rappel, statut par occurrence : faite / sautée).
- **SessionLog** : séance réalisée, avec une **copie** de la séance pour que modifier un modèle ne fausse pas l'historique.
- **Settings** : réglages.

Chaque bloc est converti en une liste plate de phases (`src/engine/phases.ts`), et un seul moteur pur (`src/engine/timer.ts`) les enchaîne. Le temps est toujours calculé depuis l'heure de début de phase, jamais en comptant des ticks : aucune dérive. Tous les bips à venir sont programmés à l'avance dans Web Audio (`src/engine/cues.ts`).

## Contraintes Android

| Sujet | Solution |
|---|---|
| Installation | PWA (manifeste + service worker) |
| Hors-ligne | Tout est pré-caché |
| Écran qui s'éteint | Wake Lock, redemandé à chaque tap tant qu'il n'est pas accordé et à chaque retour ; vidéo en secours sans l'API |
| Précision | Temps calculé depuis l'heure de départ |
| Sons en arrière-plan | Bips rendus en piste audio (fichier WAV) lue par un lecteur audio : continue app en arrière-plan / écran verrouillé (réglage « Son en arrière-plan », met en pause la musique des autres apps) ; la voix reste au premier plan. À valider sur le téléphone |
| Rappels | Seulement app ouverte (limite du navigateur) |
| Séance en cours | Enregistrée à chaque changement (localStorage, heure réelle) et reprise à la réouverture si le téléphone a fermé l'app |
| Données | Stockage persistant demandé + export JSON conseillé |

## Feuille de route

1. ✅ Socle et chrono (tous les modes, sons, voix, vibration, wake lock)
2. ✅ Séances et bibliothèque (éditeur multi-blocs, Personnalisé, exercices, favoris, étiquettes, WOD connus, partage)
3. ✅ Enregistrement et historique (Résultat, saisie manuelle, comparaison, stats)
4. ✅ Planification (calendrier, récurrence, Aujourd'hui, rappels app ouverte)
5. ✅ Finitions (export/import, thèmes, réglages audio fins)

## Animation des exercices (branche `mode-photo`, en cours)

Pendant l'effort, un avatar animé montre l'exercice à côté du chrono ; il disparaît au repos et revient à l'effort suivant, et se fige en pause. Réglage **coupé par défaut** (Réglages › Animation des exercices) : rien ne change pour qui ne l'active pas.

- L'avatar est **dessiné par l'app** (SVG, `src/anim/`), pas un GIF : il se règle (sexe, carnation, morphologie, âge, taille, cheveux, tenue) et reste 100 % local.
- Exercices animés : squat, pompe, gainage, jumping jack, fente, burpee, mountain climber, abdos, montées de genoux. Reconnus d'après le nom de l'exercice ou de l'étape ; un AMRAP / For Time montre ses exercices à tour de rôle (8 s chacun). Exercice inconnu : pas d'animation.
- Créateur de séance : dans la fiche d'un effort, sous le commentaire, une liste « Exercice animé » (visible seulement si l'animation est activée) choisit l'exercice à la main, avec un aperçu ; il passe avant la reconnaissance par le nom, et nomme le bloc s'il n'a pas de commentaire.
- L'avatar : style « flat design » sans contour (ombres ton sur ton, cheveux fixés à la tête, chaussettes, visage simple).
- Suite prévue : choisir le matériel (haltères, kettlebell, élastique, chaise…) avec une animation adaptée ; exercices de renforcement ; exercices sur chaise pour les seniors ; variantes (fente grand pas / petit pas, mains sur les hanches) ; liste aussi dans l'éditeur par blocs ; plus d'exercices (mobilité, assis, élastique, kettlebell…) ; animation dans l'affichage agrandi ; joindre sa propre photo / GIF à un exercice.
- Piste à plus long terme : offres payantes par mode et deux profils (coach qui programme, pratiquant qui réalise). Un vrai partage coach → pratiquant demanderait un serveur et des comptes, contraire au « 100 % local » actuel : à décider le moment venu.

## Mini-fenêtre (dans l'app)

Raccourci « porte » en haut à droite du chrono et du plein écran (pendant la séance) : le chrono reste affiché en petit par-dessus les autres apps, comme une vidéo YouTube, et la séance continue (temps et sons). La mini-fenêtre montre la phase, le temps, l'étape suivante, le tour et une barre d'avancement ; ses boutons pause / suivant / précédent pilotent la séance. Le navigateur ne met en mini-fenêtre qu'une vidéo : le chrono est dessiné dans un canevas filmé en direct (`src/lib/pip.ts`, contenu calculé et testé dans `src/lib/pipView.ts`). Ouverture automatique en quittant l'app : la vidéo du chrono est préparée dès le départ de la séance et l'action « enterpictureinpicture » des contrôles média est déclarée ; Chrome l'utilise quand il le permet (ordinateur depuis Chrome 134 ; Android non garanti), de préférence avec « Son en arrière-plan » activé (une piste audio joue). Sinon, bouton « Mini-fenêtre ».

## Reste à faire / idées

- Créateur de séance : modèles tout prêts (Tabata, EMOM, 30/30) dans la colonne de gauche ; glisser un bloc d'une série à une autre.

- Tests unitaires de `src/engine/session.ts` (la liaison moteur / son), aujourd'hui couverte seulement par les parcours Playwright.

- **Tester sur le vrai téléphone** : une séance Tabata complète écran verrouillé (sons en arrière-plan), les rappels.
- Voix : la synthèse vocale du téléphone est utilisée ; des fichiers voix enregistrés seraient plus fiables en arrière-plan.
- Réordonner les blocs : boutons ↑ ↓ (le glisser-déposer tactile reste à faire).
- Mettre la PWA en ligne : rendre le dépôt public (GitHub Pages) ou utiliser Netlify / Cloudflare Pages.
