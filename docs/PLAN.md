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

## Animation des exercices

Pendant l'effort, un avatar animé montre l'exercice à côté du chrono ; il disparaît au repos et revient à l'effort suivant, et se fige en pause. Activée par défaut ; elle se coupe dans Réglages › Animation des exercices.

- L'avatar est **dessiné par l'app** (SVG, `src/anim/`), pas un GIF : il se règle (sexe, carnation, morphologie, âge, taille, cheveux, tenue) et reste 100 % local.
- Exercices animés (63 écrits à la main + 135 variantes générées, soit 198), en 4 catégories (un exercice peut être dans deux). MI (membres inférieurs) : squat, fente, mollets, pont fessier, squat sauté, montées de genoux et talons-fesses (aussi en cardio). MS (membres supérieurs) : pompe, pompe sur les genoux. Tronc (abdos compris) : gainage, gainage latéral, superman, bird dog, abdos, relevés de jambes, mountain climber. Cardio : burpee, jumping jack, tipping, pas chassés, montées de genoux, talons-fesses. Avec matériel : kettlebell (swing, goblet squat), élastique (curl, élévations latérales), haltères (curl, développé épaules, rowing), anneau de Pilates (compression bras, pont fessier avec anneau) ; sur chaise : assis-debout, extension de genou, montée de genou, dips, curl et développé épaules assis (haltères), rowing assis (élastique), élévation frontale assis (kettlebell). Le nom reconnu le plus précis l'emporte. Ajoutés sans matériel : MI — squat bulgare (pied arrière sur la chaise, visible en Debout et en Chaise), relevé de la pointe des pieds, abduction et adduction de la jambe, extension de la jambe vers l'arrière ; MS — poussée des épaules vers le haut et vers l'avant, biceps, triceps, haussement des épaules, tirage menton, élévations latérales, élévation frontale, pectoraux (coudes à 90°, de profil : serrés devant puis écartés sur les côtés), développé Arnold (coudes à 90° écartés, poussée, retour, coudes qui se rejoignent devant puis se réécartent ; aussi aux haltères) ; tronc — sit-up (en V, jambes tendues vers les bras), obliques (buste fixe, rotation vers la cheville droite puis gauche, bras tendus), shoulder tap, gainage dynamique, bûcheron, good morning, superman frontal et latéral (buste à 90°). Les noms courts (« Curl biceps », « Élévations latérales », « Élévation frontale ») désignent la version sans matériel. Variantes (`src/anim/variants.ts`, identifiants stables « base-c », « base-db », « base-db-c »…) : chaque exercice sans matériel a sa version sur chaise (assis ; pompe, gainage, mountain climber et shoulder tap mains sur l'assise ; extension de la jambe vers l'arrière mains sur le dossier ; sit-up remplacé par « genou poitrine assis »), et le plus possible ont leurs versions haltères, kettlebell, élastique (tenu sous les pieds, ou en mini-bande aux genoux / chevilles) et anneau de Pilates (entre les mains, ou entre les genoux / chevilles), debout et sur chaise. Parmi les exercices sans matériel, seul le gainage dynamique n'a pas de version chaise ; parmi les plus anciens, ont aussi leur version chaise les mollets, la pompe, le gainage, le mountain climber et le jumping jack.
- Créateur de séance : dans la fiche d'un effort, sous le commentaire, un sélecteur « Exercice animé » (bouton « Exercices », seulement si l'animation est activée) : choix en deux temps : position (debout par défaut, ou chaise) puis matériel (sans matériel par défaut, kettlebell, élastique, haltères, anneau de Pilates), deux colonnes, catégories en bandeaux de couleur, miniatures ; choisit l'exercice à la main, avec un aperçu ; il passe avant la reconnaissance par le nom, et nomme le bloc s'il n'a pas de commentaire.
- L'avatar : style « flat design » sans contour (ombres ton sur ton, cheveux fixés à la tête, chaussettes, visage simple).
- Suite prévue : plus d'exercices avec matériel ; exercices sur chaise pour les seniors ; variantes (fente grand pas / petit pas, mains sur les hanches) ; liste aussi dans l'éditeur par blocs ; plus d'exercices (mobilité, assis, élastique, kettlebell…) ; animation dans l'affichage agrandi ; joindre sa propre photo / GIF à un exercice.
- Piste à plus long terme : offres payantes par mode et deux profils (coach qui programme, pratiquant qui réalise). Un vrai partage coach → pratiquant demanderait un serveur et des comptes, contraire au « 100 % local » actuel : à décider le moment venu.

## Pulse Poly

Jeu de plateau sportif, 2 à 6 joueurs sur le même téléphone (Séances › Créer › Jeu de société › Pulse Poly). Plateau original de 40 cases (pas celui d'un jeu existant) : Départ, Salle de sport, Récup, « Direction la salle de sport » ; 22 cases exercice en 8 groupes de couleur ; 4 cartes cardio ; cases Défi et Culture AP. Règles, toutes en répétitions faites pour de vrai (avatar animé) :
- Case exercice libre : la passer = 15 rép., l'acheter = 30 rép. ; ensuite le propriétaire ne fait plus rien chez lui ; les autres y font 20 rép.
- Carte cardio (de base 15 tipping + 10 jumping jacks + 5 burpees, modifiable) : toujours au prix indiqué : passer, acheter ou tomber chez un autre joueur = son contenu une fois, quel que soit le nombre de cartes détenues.
- Un dé ; un 6 fait rejouer ; trois 6 de suite, la case « Direction… » ou une carte Défi envoient en salle de sport. Là, on fait aussi tous les exercices des autres joueurs ; on en sort sur un 6 ou après 3 tours.
- Fin : course en N tours de plateau (4 par défaut ; un tour = un passage par le Départ, y compris par une carte ; la salle de sport ne compte pas) : le premier qui les termine gagne et la partie s’arrête. Ou illimitée (« Terminer la partie » dans le menu), ou abandon (ses cases se libèrent). Sans course, gagnant : le plus de cases ; à égalité, le moins de répétitions.
- Exercices du plateau : aléatoires (debout, sans matériel) ou choisis case par case. Partie sauvegardée sur le téléphone.
- Cartes Défi et Culture AP provisoires (dont le don d'exercice à un autre joueur) : à retravailler.
- Moteur pur et testé : `src/game/game.ts`.

## Reste à faire / idées

- Jeux de société sportifs (« Créer » → jeu de société) : bataille navale contre l’ordinateur (placement des bateaux à la main, marques « rien ici ») et jeu de l’oie (un dé, ascenseurs, 1 à 6 joueurs, seul contre l’ordinateur) faits, logique dans `src/games/` (testée). Mémo fait (4 niveaux, 1 à 6 joueurs, points ; seul contre l’ordinateur, qui retient 3 cartes sur 4). Reste : Monopoly, 1000 Bornes, roulette russe. Une partie en cours n’est pas reprise si l’app est fermée.

- Mini-fenêtre (image dans l'image, comme YouTube) : essayée puis retirée (nov. 2026). Safari sur iPhone refuse de mettre en mini-fenêtre une vidéo générée en direct (« non pris en charge ») ; seule une app native le permettrait. Alternative possible sur iPhone : la séance sur l'écran verrouillé / la Dynamic Island (avec « Son en arrière-plan »), avec barre de temps de la phase.

- Créateur de séance : modèles tout prêts (Tabata, EMOM, 30/30) dans la colonne de gauche ; glisser un bloc d'une série à une autre.

- Tests unitaires de `src/engine/session.ts` (la liaison moteur / son), aujourd'hui couverte seulement par les parcours Playwright.

- **Tester sur le vrai téléphone** : une séance Tabata complète écran verrouillé (sons en arrière-plan), les rappels.
- Voix : la synthèse vocale du téléphone est utilisée ; des fichiers voix enregistrés seraient plus fiables en arrière-plan.
- Réordonner les blocs : boutons ↑ ↓ (le glisser-déposer tactile reste à faire).
- Mettre la PWA en ligne : rendre le dépôt public (GitHub Pages) ou utiliser Netlify / Cloudflare Pages.
