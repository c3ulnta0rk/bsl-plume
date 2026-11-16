# Plume

Gestion de tournois de badminton, pour le web et le mobile avec un seul code : inscriptions en ligne, tirages, pilotage des terrains, scores en direct, heures de passage estimées et alertes pour les joueurs.

Cette branche est une réécriture complète. L'ancienne version Nuxt reste sur `main`.

## Ce que fait l'application

**Pour un joueur ou un spectateur**, sans compte :
- s'inscrire à un ou plusieurs tableaux, avec confirmation par mail ;
- scanner le QR code de la salle, choisir « je joue » ou « je suis un joueur » ;
- voir son prochain match en très gros : heure estimée, terrain, adversaire, temps libre restant ;
- être prévenu à l'appel du match et une dizaine de minutes avant ;
- suivre les scores en direct, les poules, les tableaux, l'historique d'un joueur.

**Pour un organisateur** :
- créer le tournoi, ses tableaux, leurs places, leur formule et leur format de score (préréglages officiels ou réglage libre) ;
- valider, refuser, mettre en attente ou déplacer une inscription, saisir celles prises par téléphone ;
- tirer les poules et le tableau final (têtes de série, séparation des clubs, tirage rejouable) ;
- piloter la journée : terrains, file d'attente, appel automatique des meilleurs matchs à lancer, score point par point ou saisie rapide ;
- gérer les imprévus : forfait, abandon, joueur retiré, format raccourci en cours de route, terrain en moins, pause, correction d'un résultat. Tout est tracé dans un journal.

## Démarrer

Il faut Node 22 ou plus récent. Aucune base à installer : en développement le serveur utilise PGlite, un PostgreSQL embarqué dans un dossier.

```bash
npm install
```

```bash
npm run seed
```

```bash
npm run salle
```

Le site est alors sur http://localhost:4000, avec trois tournois de démonstration (un en cours, un à venir, un terminé). Le compte organisateur de démonstration est affiché à la fin de `npm run seed`.

Pour développer l'interface avec rechargement à chaud, lancez le serveur (`npm run dev`) et l'application (`npm run dev:app`, sur le port 8081) dans deux terminaux.

## Vérifier

```bash
npm test
```

```bash
npm run typecheck
```

`npm test` lance les tests du moteur (règles, poules, tableaux, planification) et un scénario de tournoi complet côté serveur. Le test de bout en bout dans un navigateur est décrit en tête de `e2e/parcours.mjs`.

## Organisation du code

| Dossier | Rôle |
|---|---|
| `packages/engine` | Moteur de tournoi, sans dépendance : formats de score, validation, classements de poule et départages, tableaux, planification des terrains et estimation des horaires. |
| `apps/server` | API (Hono), base (Drizzle, PostgreSQL ou PGlite), temps réel (WebSocket), mails, notifications. Sert aussi le site web compilé. |
| `apps/app` | Application Expo : web, Android et iOS avec le même code (Expo Router, React Native Web). |
| `e2e` | Parcours complet joué dans un navigateur. |
| `docs` | Architecture, hébergement et mode salle, limites connues. |

## Documentation

- [Architecture et choix techniques](docs/architecture.md)
- [Hébergement et mode salle sans Internet](docs/hebergement.md)
- [Limites connues et suites possibles](docs/limites.md)
