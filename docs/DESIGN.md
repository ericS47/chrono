# Design de Pulse

Validé le 21/10/2026, complété depuis. Les fonctionnalités sont décrites dans [PLAN.md](PLAN.md).

Direction retenue : **« E · Synthèse »** = le style « Clair », la mise en page « A », et les couleurs de phase plein écran « C ».

## Style « Clair »

| Jeton | Valeur |
|---|---|
| Fond | `#F7F6F3` (blanc cassé) |
| Cartes | `#FFFFFF`, bordure `#ECEAE4`, rayon 16 à 22 px |
| Texte | `#1F2328`, secondaire `#6B6F76` |
| Accent | `#4F5BD5` (bleu lavande), teinte `#EEF0FC` |
| Succès | `#2E7A5E` (sauge), teinte `#E6F3EE` |
| Police | Manrope (400 à 800), chiffres tabulaires |

Thème sombre disponible en option (jetons dans `src/styles.css`, `:root[data-theme='dark']`).

## Mise en page

- **Barre d’onglets** en bas : Accueil / Planning / Séances / Réglages.
- **Accueil** : salutation et slogan, carte « Séance du jour » pleine couleur accent (Démarrer, Décaler ; ou « Rien de prévu »), deux grandes tuiles centrées avec icône, puis la dernière séance faite.
  - « Ma séance » (à gauche) ouvre Séances › Mes séances : bouton rond « Créer », 2 favoris au plus, la dernière séance faite, puis « Toutes mes séances » repliées.
  - « Types de séances » (à droite) ouvre les 10 modes + « WOD connus » : tuiles **remplies de la couleur du mode**, 2 par ligne, titre centré, sans description.
- **Créer** : deux gros boutons, « Séance de sport » (créateur de séance) et « Jeu de société ».
- **Planning** : bandeau de la semaine (ou grille du mois), séances du jour sous forme de créneaux horaires, stats de la semaine, bouton flottant « Planifier ».
- **Chrono** : anneau de progression, nom de phase + très grand chiffre, deux cartes (Tour, Restant), liste des prochaines phases, boutons Revenir / Pause / action principale. En paysage, l’anneau passe à gauche.
- **Affichage agrandi** : le chiffre en plein écran sur la couleur de la phase, avec le temps restant de la séance, en haut à gauche un compteur « 3/5 » (séance du créateur : étape en cours du bloc de travail, efforts et séries comptés, repos non ; la série reste rappelée sous le temps ; autres modes : tour ou série), les raccourcis Revenir / Pause / Étape suivante et un bouton « + » sur le côté pour ajouter une étape oubliée. En paysage, le chiffre est réduit pour laisser la place aux raccourcis.
- **Jeux** : le plateau s’adapte à l’écran entier, sans défilement ; en paysage, les informations complémentaires passent à droite. La fiche d’exercice est centrée et tient à l’écran avec son bouton « C’est fait ».

## Couleurs pendant le chrono (plein écran)

| Phase | Couleur |
|---|---|
| Effort | abricot doux `#FFBE98` (positif et doux, **pas de rouge**) |
| Repos | gris clair neutre `#DDE2EA` |
| Préparation / prêt | lavande `#D9DCF7` |
| Terminé | vert d'eau `#CFE8DC` |
| Encre | `#14183A` |

## Couleurs des modes (tuiles)

AMRAP `#FFBE98` · EMOM `#3DD6C6` · For Time `#FFC93C` · Tabata `#B9A6FF` · Intervalles `#FF9F5A` · Chrono `#8FA3FF` · Compte à rebours `#9BD3F5` · Personnalisé `#F5A8C8` · Musculation `#B5D98A` · Course `#7FD1A8` · WOD connus `#E6CBA8`

## Créateur de séance

Ouvert par « Créer » › Séance de sport. Colonne de blocs à gauche (Effort, Repos, Série, Bloc de travail), timeline à droite, durée totale et bande colorée du déroulé en haut (toujours visibles), vue calée sur les derniers blocs ajoutés, « Lancer la séance » en bas.
- Préparation toujours en tête, réglable (0 à 60 s), la séance démarre vide.
- Toucher un bloc : durée et commentaire ; appui long : copier ; toucher l'en-tête d'un bloc de travail : même menu que l'appui long (Copier, Régler, Supprimer) ; poignée ⋮⋮ : glisser pour déplacer.
- Série : blocs qui se suivent, répétés ; son dernier repos sert de récupération entre deux séries et disparaît après la dernière.
- Bloc de travail : regroupe blocs et séries, avec un nom, répétable (pas de bloc de travail dans un autre).
- Enregistrée comme un bloc « Personnalisé » portant la timeline ; « Modifier » rouvre le créateur. Les autres séances gardent l'éditeur par blocs.
