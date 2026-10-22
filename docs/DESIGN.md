# Design de Chrono (validé le 21/10/2026)

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

- **Accueil** : date + titre, carte « Séance du jour » pleine couleur accent (Démarrer, Décaler), grille de chronos rapides (les 10 modes + « WOD connus », toutes en tuiles **remplies de la couleur du mode**), dernière séance (« Mes séances » est dans l'onglet Séances), barre d'onglets en bas (Accueil / Planning / Séances / Réglages).
- **Planning** : bandeau de la semaine (ou grille du mois), séances du jour sous forme de créneaux horaires, stats de la semaine, bouton flottant « Planifier ».
- **Chrono** : anneau de progression, nom de phase + très grand chiffre, deux cartes (Tour, Restant), liste des prochaines phases, boutons Revenir / Pause / action principale. En paysage, l'anneau passe à gauche.

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
