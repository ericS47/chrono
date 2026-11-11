# Plan de Pulse

Ce que fait l’app, les décisions prises et ce qui reste à faire. Le design est décrit dans [DESIGN.md](DESIGN.md).

## Vision

Une PWA installable sur le téléphone (iPhone ou Android) qui sert de chrono de séance : on prépare ses séances à l’avance, on les lance d’un tap, et l’app guide à la voix et au bip, même téléphone posé au sol. Trois piliers : construire une séance, la planifier, garder une trace. S’y ajoutent des jeux de société sportifs.

## Décisions fermes

- 100 % local : aucun compte, aucun cloud ni synchro, pas de suivi cardio, pas de Google Fit / Health Connect, pas de montre, pas de partage social (le partage par lien / QR ne passe par aucun serveur).
- PWA uniquement, publiée sur GitHub Pages. Pas d’app native.
- Tous les types d’entraînement : CrossFit / HIIT, musculation, course (sans GPS), mobilité.
- Préparation réglable de 0 à 60 s (défaut 10 s, modifiable par séance et juste avant de lancer).
- En fin de séance : enregistrer ou non (réglage : toujours demander / toujours / jamais).
- Rappels : notifications du navigateur, sans serveur ; elles ne s’affichent que si l’app est ouverte.

**Écarté** (ne pas reproposer sans élément nouveau)

- APK Capacitor : abandonné le 21/10/2026.
- Mini-fenêtre (image dans l’image) : essayée puis retirée en novembre 2026. Safari sur iPhone refuse une vidéo générée en direct ; seule une app native le permettrait.

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
| Personnalisé | Suite libre d’étapes nommées | Étapes (nom, durée, effort / repos), répétitions |
| Musculation | Séries × reps, repos chronométré | Exercices, séries, reps, charge, repos ; bouton « Série terminée » |
| Course | Segments en durée | Segments (nom, durée, allure), répétitions |

## Fonctionnalités

1. **Créateur de séance** (bouton « Créer » › Séance de sport) : timeline de blocs Effort et Repos, regroupés en Séries (répétées) et en Blocs de travail (nommés, répétables). Détail dans DESIGN.md. La séance est enregistrée comme un bloc « Personnalisé » portant la timeline.
2. **Éditeur par blocs** (pour les autres séances) : une séance = suite de blocs (un mode + ses paramètres + des exercices nom / reps / charge), repos optionnel entre blocs, durée estimée, dupliquer / monter / descendre / supprimer un bloc.
3. **Bibliothèque** : mes séances (recherche, favoris, étiquettes), WOD connus pré-remplis (Cindy, Fran, Murph, Helen…), chrono rapide sans créer de séance, partage par lien ou QR code.
4. **Chrono** : pause / passer / revenir, affichage agrandi (temps restant de la séance, compteur « 3/5 », raccourcis, bouton « + » pour ajouter une étape oubliée en cours de séance), mode paysage, reprise de la séance si le téléphone a fermé l’app.
5. **Planification** : vue semaine / mois, séance à une date et une heure, récurrence hebdomadaire (jours + date de fin), séance du jour sur l’accueil (Démarrer, Décaler), rappel X minutes avant.
6. **Historique** : écran Résultat (temps For Time, tours + reps AMRAP, charges, RPE 1-10, note), saisie manuelle, historique par mois et par séance, stats (séances / semaine, temps total, semaines actives de suite), suppression automatique de l’historique ancien.
7. **Réglages** : son (mode silencieux, volumes général / bips / voix, son en arrière-plan, bips du décompte final, annonces vocales : nom de la phase, numéro du tour, temps restant ; boutons Tester), préparation par défaut, vibration, écran toujours allumé, animation des exercices, thème, rappels, données (export / import JSON, espace occupé).
8. **Jeux de société sportifs** (bouton « Créer » › Jeu de société) : voir plus bas.

## Son

- **Bips** : programmés à l’avance dans Web Audio (`src/engine/cues.ts`). Décompte final (0 à 5 bips), début et fin de phase, bip à la moitié de chaque effort et de chaque repos d’au moins 20 s.
- **Annonces vocales** : « Go », « Repos », « Tour 3 sur 8 », « 30 secondes »… « Mi-temps » n’est dit que pendant un effort (un simple bip pendant un repos). « On change » est dit quand un effort suit directement un autre effort.
- **Voix enregistrée** : les annonces sont des extraits enregistrés (voix Piper « siwis ») réunis dans `public/voix-fr.mp3`, avec leur index dans `src/audio/voix-fr.json`. Ils sont joués comme les bips, donc ils ne coupent pas la musique. Phrases fixes, nombres 1 à 60, « Tour / Série / Minute N sur M » composés, noms des exercices. Un commentaire libre n’est pas lu. La voix du téléphone ne sert qu’en secours tant que le fichier n’est pas chargé. Régénération : `scripts/voix/generer.py`.
- **Réglage « Son en arrière-plan »** :
  - coupé : le son se mélange à la musique d’une autre app (Spotify…), app ouverte ; sur iPhone, le bouton silencieux le coupe ;
  - activé : bips et annonces sont rendus dans une piste audio (60 min au plus) qui continue app en arrière-plan ou écran verrouillé, mais la musique des autres apps se met en pause.

## Contraintes du téléphone

| Sujet | Solution |
|---|---|
| Installation | PWA (manifeste + service worker) ; mise à jour appliquée seulement hors séance |
| Hors-ligne | Tout est pré-caché, voix comprise |
| Écran qui s’éteint | Wake Lock, redemandé à chaque tap et à chaque retour ; vidéo en secours sans l’API |
| Précision | Temps calculé depuis l’heure de début de phase, jamais en comptant des ticks |
| Son coupé par le téléphone | Surveillance de l’horloge audio : le son est reprogrammé s’il dérive ou si la piste s’arrête |
| Séance en cours | Enregistrée à chaque changement (localStorage, heure réelle) et reprise à la réouverture |
| Rappels | Seulement app ouverte (limite du navigateur) |
| Données | Stockage persistant demandé + export JSON conseillé |

## Modèle de données (IndexedDB, voir `src/data/types.ts`)

- **Workout** : séance modèle (blocs, étiquettes, favori, préparation et son propres).
- **Block** : mode, paramètres, exercices, repos après.
- **ScheduledSession** : séance planifiée (date, heure, jours de récurrence, fin, rappel, statut par occurrence : faite / sautée).
- **SessionLog** : séance réalisée, avec une **copie** de la séance pour que modifier un modèle ne fausse pas l’historique.
- **Settings** : réglages.

Chaque bloc est converti en une liste plate de phases (`src/engine/phases.ts`), et un seul moteur pur (`src/engine/timer.ts`) les enchaîne.

## Animation des exercices

Pendant l’effort, un avatar animé montre l’exercice à côté du chrono ; il disparaît au repos et se fige en pause. Activée par défaut ; elle se coupe dans Réglages › Animation des exercices.

- L’avatar est **dessiné par l’app** (SVG, `src/anim/`), pas un GIF : style « flat design » sans contour, réglable (sexe, carnation, morphologie, âge, taille, cheveux, tenue), 100 % local.
- 326 exercices : 83 écrits à la main (`src/anim/exercises.ts`) et 243 variantes générées (`src/anim/variants.ts`, identifiants stables « base-c », « base-db », « base-db-c »…). La liste complète est dans ces deux fichiers, pas ici.
- 4 catégories : membres inférieurs, membres supérieurs, tronc, cardio (un exercice peut être dans deux).
- Variantes : position (debout ou sur chaise) et matériel (sans, haltères, kettlebell, élastique, anneau de Pilates). La plupart des exercices sans matériel ont leur version sur chaise ; le sit-up y devient « genou poitrine assis ».
- Chaque matériel a des exercices dans les 4 catégories, debout et sur chaise (cardio compris : jumping jack, squat sauté, thruster, boxe dans le vide…). Seules des adaptations qui se pratiquent vraiment sont proposées ; l’anneau de Pilates sert en compression (mains, genoux, chevilles, bras contre la hanche), en écartement ou tenu à bout de bras.
- Un test vérifie que chaque exercice a son annonce vocale enregistrée.
- Les noms courts (« Curl biceps », « Élévations latérales », « Élévation frontale ») désignent la version sans matériel. Quand plusieurs noms sont reconnus, le plus précis l’emporte.
- Créateur de séance : dans la fiche d’un effort, un sélecteur « Exercice animé » (seulement si l’animation est activée) : position, puis matériel, puis exercice, avec miniatures et aperçu. Ce choix passe avant la reconnaissance par le nom, et nomme le bloc s’il n’a pas de commentaire.

## Jeux de société sportifs

Les exercices se font pour de vrai, avec l’avatar animé. Le plateau occupe tout l’écran ; en paysage, les informations passent à droite. Logique pure et testée dans `src/games/` (Pulse Poly : `src/game/game.ts`).

| Jeu | Principe |
|---|---|
| Bataille navale | Contre l’ordinateur ; placement des bateaux à la main, marques « rien ici » |
| Jeu de l’oie | Un dé, ascenseurs, 1 à 6 joueurs ; seul, contre l’ordinateur |
| Mémo | 4 niveaux, 1 à 6 joueurs, points ; seul, contre l’ordinateur (qui retient 3 cartes sur 4) |
| La roue de la santé | Roue animée, exercices en répétitions ou en temps avec décompte, cases repos |
| Pulse Poly | Voir ci-dessous |
| 1000 Bornes | À faire |

Seule la partie de Pulse Poly est sauvegardée ; les autres jeux ne reprennent pas une partie si l’app est fermée.

### Pulse Poly

2 à 6 joueurs sur le même téléphone. Plateau original de 40 cases (pas celui d’un jeu existant) : Départ, Salle de sport, Récup, « Direction la salle de sport » ; 22 cases exercice en 8 groupes de couleur ; 4 cartes cardio ; cases Défi et Culture AP.

- Case exercice libre : la passer = 15 rép., l’acheter = 30 rép. ; ensuite le propriétaire ne fait plus rien chez lui ; les autres y font 20 rép.
- Carte cardio (de base 15 tipping + 10 jumping jacks + 5 burpees, modifiable) : passer ou acheter = son contenu une fois (prix indiqué). Chez un autre joueur : son contenu majoré de +20 % s’il en a 2, +50 % à 3, +100 % à 4 (arrondi à l’entier supérieur).
- Un dé ; un 6 fait rejouer ; trois 6 de suite, la case « Direction… » ou une carte Défi envoient en salle de sport. Là, on fait aussi tous les exercices des autres joueurs ; on en sort sur un 6 ou après 3 tours.
- Fin : course en N tours de plateau (4 par défaut ; un tour = un passage par le Départ, y compris par une carte ; la salle de sport ne compte pas) : le premier qui les termine gagne et la partie s’arrête. Ou partie illimitée (« Terminer la partie » dans le menu), ou abandon (ses cases se libèrent). Sans course, gagnant : le plus de cases ; à égalité, le moins de répétitions.
- Exercices du plateau : aléatoires (debout, sans matériel) ou choisis case par case.

## Reste à faire / idées

**Jeux**
- 1000 Bornes.
- Pulse Poly : cartes Défi et Culture AP provisoires (dont le don d’exercice à un autre joueur), à retravailler.
- Reprendre une partie en cours après fermeture de l’app (autres jeux que Pulse Poly).

**Créateur de séance et éditeur**
- Modèles tout prêts (Tabata, EMOM, 30/30) dans la colonne de gauche.
- Glisser un bloc d’une série à une autre.
- Éditeur par blocs : glisser-déposer tactile (aujourd’hui boutons monter / descendre) et sélecteur d’exercice animé.

**Animation**
- Plus d’exercices (mobilité, matériel) et de variantes (fente grand pas / petit pas, mains sur les hanches).
- Animation dans l’affichage agrandi.
- Joindre sa propre photo / GIF à un exercice.

**Technique**
- Tests unitaires de `src/engine/session.ts` (liaison moteur / son), couverte seulement par les parcours Playwright.
- Vérifier les rappels sur le vrai téléphone.
- iPhone : afficher la séance sur l’écran verrouillé / la Dynamic Island avec une barre de temps de la phase (avec « Son en arrière-plan »).

**À plus long terme**
- Offres payantes par mode et deux profils (coach qui programme, pratiquant qui réalise). Un vrai partage coach → pratiquant demanderait un serveur et des comptes, contraire au « 100 % local » : à décider le moment venu.
