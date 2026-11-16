# CLAUDE.md

Plume : gestion de tournois de badminton. Monorepo npm (workspaces), tout en TypeScript, interface et commentaires en français.

## Commandes

```bash
npm install            # depuis la racine
npm test               # moteur + scénario serveur
npm run typecheck      # les trois paquets
npm run seed           # données de démonstration (PGlite dans apps/server/.data)
npm run salle          # compile le site puis sert tout sur http://localhost:4000
npm run dev            # serveur seul, rechargement à chaud
npm run dev:app        # Expo web sur le port 8081, parle au serveur sur le port 4000
```

Test de bout en bout : voir l'en-tête de `e2e/parcours.mjs` (serveur vierge sur le port 4100).

## Repères

- `packages/engine` : toute la logique de tournoi, pure et testée. Toute nouvelle règle commence ici, avec son test.
- `apps/server/src/services/draw.ts` : `settleCategory` remet un tableau en cohérence après n'importe quel changement. Toute action qui modifie des matchs doit l'appeler, puis `changed()` (temps réel et alertes).
- `apps/server/src/services/snapshot.ts` : l'état public d'un tournoi. Ne jamais y mettre de mail ni de téléphone.
- `apps/app/src/ui` : thème et composants de base. `apps/app/src/features` : composants métier (match, poule, tableau).
- Schéma : `apps/server/src/db/schema.ts`, puis `npm run db:generate --workspace @plume/server` pour créer la migration.

## Pièges

- Expo change souvent : lire la doc de la version installée (`expo` dans `apps/app/package.json`) avant de toucher une API Expo, et installer avec `npx expo install`.
- Sur le web, la pile de navigation garde les écrans précédents dans la page, masqués : dans les tests navigateur, ne viser que les éléments visibles.
- `pkill -f` avec un motif présent dans sa propre ligne de commande tue aussi le shell qui le lance.
