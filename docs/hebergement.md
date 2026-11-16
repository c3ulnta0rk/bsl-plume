# Hébergement et mode salle

## Héberger le site

Un seul processus sert l'API, le temps réel et le site web, sur un seul port. Il se place derrière n'importe quel serveur frontal qui gère le HTTPS (Caddy, nginx, Traefik). Le HTTPS est nécessaire pour les notifications du navigateur.

1. Copier `.env.example` en `.env` et le remplir (adresse publique, base, serveur de mail).
2. Lancer :

```bash
docker compose up -d --build
```

Le fichier `docker-compose.yml` démarre l'application et un PostgreSQL. Les migrations s'appliquent toutes seules au démarrage. Sans Docker : `npm ci`, `npm run build:web`, puis `npm start` avec les mêmes variables d'environnement.

Le serveur frontal doit laisser passer les WebSockets sur `/ws`.

## Mode salle : le tournoi sans Internet

Si le gymnase n'a pas de réseau, le tournoi peut tourner sur un ordinateur de la salle, relié à une borne Wi-Fi qui ne donne accès qu'à lui.

**Avant le tournoi, avec Internet**

1. Sur le site hébergé : Réglages, « Exporter le tournoi ». Vous obtenez un fichier `.plume.json`.
2. Sur l'ordinateur de la salle : installer Node 22, récupérer le dépôt, puis `npm install`.

**Dans la salle**

3. Brancher l'ordinateur sur la borne Wi-Fi, puis lancer :

```bash
npm run salle
```

Le serveur affiche ses adresses sur le réseau local, par exemple `http://192.168.1.10:4000`.

4. Ouvrir cette adresse, créer un compte organisateur local, puis dans « Organiser » choisir « Importer un export » et sélectionner le fichier.
5. Dans l'onglet « Affiche QR », remplacer l'adresse du site par l'adresse locale et imprimer l'affiche. Les joueurs se connectent au Wi-Fi de la salle et scannent le code.

**Après le tournoi**

6. Exporter depuis l'ordinateur de la salle, puis importer sur le site hébergé : les résultats et l'historique des joueurs y sont repris.

### Ce qui change sans Internet

- Les mails ne partent pas. Les inscriptions de dernière minute se saisissent à la main.
- Les notifications du navigateur ne fonctionnent pas : elles passent par les serveurs des éditeurs de navigateurs. Les alertes s'affichent quand même dans la page tant qu'elle reste ouverte, et l'écran « Mon suivi » se met à jour en direct.
- Tout le reste fonctionne à l'identique.

### Réseau faible mais présent

Rien à faire de particulier : chaque écran se reconnecte seul après une coupure et se remet à jour. Un bandeau prévient quand le direct est interrompu.

## Application mobile

Le même code se compile pour Android et iOS avec EAS (`npx eas-cli build`). Il faut définir `EXPO_PUBLIC_API_URL` avec l'adresse du site hébergé au moment de la compilation. Voir [les limites](limites.md) : cette compilation n'a pas encore été testée sur un téléphone.
