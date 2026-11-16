# Limites connues et suites possibles

## Ce qui a été vérifié

- Moteur : 25 tests unitaires.
- Serveur : un scénario de tournoi complet (16 tests), joué sur PGlite et sur un vrai PostgreSQL.
- Site web : parcours complet joué dans Chrome, en format bureau et en format téléphone (26 vérifications), plus un passage sur toutes les pages sans erreur ni débordement.
- Le code se compile pour Android et iOS (`expo export`), et `expo-doctor` ne signale rien.
- L'image Docker se construit et démarre (testée avec podman, en mode PGlite).

## Ce qui n'a pas été vérifié

- **L'application sur un vrai téléphone.** Aucun appareil ni émulateur n'était disponible. Le code natif des notifications (Expo) est écrit mais jamais exécuté.
- **Les notifications du navigateur de bout en bout.** L'abonnement et l'envoi sont écrits, mais la réception réelle sur un téléphone demande un site en HTTPS.
- **L'envoi réel des mails.** Testé jusqu'à la boîte d'envoi, pas avec un vrai serveur SMTP.
- **Le `docker-compose.yml` complet** (application et PostgreSQL ensemble). L'image seule et PostgreSQL seul ont été testés, pas leur assemblage.

## Limites fonctionnelles

- Sur iPhone, les notifications du navigateur exigent que le site soit ajouté à l'écran d'accueil. Il manque encore le manifeste d'application web pour que cet ajout soit propre.
- Pas de paiement en ligne : c'est voulu, le site rappelle seulement les modalités.
- Formules disponibles : poules puis tableau, poules seules, élimination directe, avec petite finale en option. Pas de tableau de consolante, pas de double élimination, pas de ronde suisse.
- Le tirage sépare les clubs dans les poules, pas dans le tableau final.
- L'heure estimée suppose une durée moyenne par format. Elle ne s'ajuste pas encore aux durées réellement observées dans la journée.
- Pas d'arbitrage détaillé : ni serveur, ni côté, ni cartons.
- Un compte n'a pas de récupération de mot de passe.
- Interface en français uniquement.

## Historique des joueurs et autres sites

L'historique affiché vient des tournois gérés dans Plume. Le numéro de licence, quand il est donné, sert à reconnaître un même joueur d'un tournoi à l'autre.

Pour le compléter avec les résultats fédéraux : la FFBaD ne publie pas d'interface de données ouverte, et Poona est un extranet réservé aux licenciés connectés. Reprendre ces données demanderait un accord avec la fédération. Le numéro de licence déjà enregistré permettrait ensuite de faire le lien.

## Formats de score officiels

Les membres de la BWF ont voté le 25 avril 2026 le passage au format 3×15 (deux sets gagnants de 15, plafond à 21) à compter du 4 janvier 2027. Le 3×21 reste autorisé pour les compétitions nationales et locales. Les deux sont proposés en préréglages ; la date d'application en France dépend de la FFBaD.
