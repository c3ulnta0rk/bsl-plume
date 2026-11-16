# Architecture

## Principe

Trois couches, de la plus stable à la plus changeante.

1. **Le moteur** (`packages/engine`) ne connaît ni la base ni l'écran. Il prend des données et rend des décisions : ce score est-il valide, qui est premier de la poule, quel match lancer maintenant, à quelle heure ce match commencera-t-il. C'est la partie la plus testée.
2. **Le serveur** (`apps/server`) applique ces décisions à la base et prévient les écrans.
3. **L'application** (`apps/app`) affiche l'état du tournoi et envoie des actions. Elle ne recalcule rien d'important : le serveur reste la référence.

## Les règles sont des données

Un format de score est un objet (`ScoringRules`) : nombre de sets, points par set, deux points d'écart ou non, plafond, set décisif différent. Les formats officiels sont des préréglages (`RULES_PRESETS`), pas du code. L'organisateur peut donc proposer un format officiel, le modifier, ou en changer en plein tournoi.

Chaque tableau a deux formats : un pour les poules, un pour le tableau final. Quand un match se termine, le format sous lequel il a été joué est figé sur le match. Changer le format d'un tableau ne touche donc que les matchs restants, et une correction ultérieure se fait toujours selon le format d'origine.

## Un tournoi qui se répare tout seul

Après chaque changement (résultat, correction, retrait, tirage), le serveur appelle `settleCategory`, qui remet le tableau dans un état cohérent :

- les places de poule (« 1er poule A ») sont reportées dans le tableau final dès qu'une poule est terminée, et recalculées si un résultat de poule est corrigé ;
- les exemptions et les forfaits sont résolus, le vainqueur avance ;
- les perdants des demi-finales alimentent la petite finale.

Cette fonction est idempotente : elle peut tourner autant de fois que nécessaire. C'est ce qui rend les imprévus sûrs, puisqu'aucune action n'a besoin de connaître toutes ses conséquences.

Gardes-fous : on ne peut pas changer le vainqueur d'un match si le match suivant du tableau est déjà lancé, ni refaire un tirage une fois qu'un match a commencé. Dans ces cas l'application explique quoi faire.

## Classement de poule

Nombre de victoires, puis :
- égalité à deux : rencontre directe ;
- égalité à trois ou plus : différence de sets, puis de points, sur toute la poule, en revenant à la rencontre directe dès qu'il ne reste que deux ex æquo ;
- égalité parfaite : tirage au sort, signalé à l'écran.

Un forfait compte comme une défaite sur le score maximal. Un abandon conserve les points acquis et crédite le vainqueur du reste. Un joueur retiré avec annulation voit tous ses résultats de poule ignorés.

## Planification des terrains

`suggestNext` choisit les matchs à lancer : jamais deux matchs avec le même joueur (y compris entre tableaux différents), les tours de poule avancent ensemble pour que tout le monde finisse en même temps, et le temps de repos est respecté tant qu'il reste un autre match possible.

`estimateSchedule` simule la suite du tournoi sur les terrains ouverts pour donner une heure de début à chaque match restant, y compris ceux dont les joueurs ne sont pas encore connus. L'estimation est refaite à chaque lecture : fermer un terrain, faire une pause ou raccourcir un format décale immédiatement toutes les heures affichées aux joueurs.

## Temps réel

Un WebSocket par écran. Le serveur n'envoie que « ce tournoi a changé » ; l'écran recharge alors l'état complet du tournoi en une requête. C'est volontairement simple : pas d'état partiel à fusionner, et une coupure réseau se rattrape toute seule à la reconnexion. Un rechargement toutes les 30 secondes sert de filet de sécurité.

## Suivi et notifications

Le suivi d'un joueur est lié à l'appareil, sans compte : l'application génère un identifiant d'appareil. Trois alertes existent : appel sur un terrain, match imminent (une douzaine de minutes avant l'heure estimée), résultat. Chacune n'est envoyée qu'une fois par appareil.

Trois canaux : bandeau en direct dans la page ouverte, notification du navigateur (Web Push, clés générées au premier lancement), notification de l'application mobile (Expo).

## Données personnelles

L'état public d'un tournoi ne contient ni adresse mail ni téléphone. Les coordonnées ne sortent que par les routes réservées aux organisateurs du tournoi concerné. Un brouillon est invisible du public.

## Pourquoi ces choix

- **Expo** : un seul code pour le site, Android et iOS. Le site peut vivre seul ; l'application se publie plus tard sans réécriture.
- **Hono + Drizzle + PostgreSQL** : serveur léger, auto-hébergeable sur une petite machine.
- **PGlite** en développement et en mode salle : même schéma et mêmes requêtes que PostgreSQL, sans rien installer.
- **Pas de bibliothèque de style** : un thème et une vingtaine de composants maison (`apps/app/src/ui`), pour garder la main sur la lisibilité.

## Animations

Tout passe par `apps/app/src/ui/motion.tsx`, bâti sur l'API `Animated` de React Native pour rester identique sur le web, Android et iOS sans dépendance native : `Appear` (apparition, avec `stagger` pour les cascades), `Pop` (rebond quand une valeur change : point marqué, rang, statut), `Pulse` et `Halo` (réservés au direct et à l'appel d'un match), `Bar`, `CountUp`, `usePress`. Les personnes qui ont demandé moins d'animations dans leur système n'en voient aucune.
