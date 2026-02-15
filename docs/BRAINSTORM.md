# BSL App - Architecture & Decisions

## Vision

Application de gestion de competitions de badminton : inscription, gestion de tableaux
(poules + elimination directe), suivi en temps reel, calendrier des matchs.
Multi-tournoi, multi-tableau, **multi-club (multi-tenant)**, mobile-first, FR/EN.

**Region** : Bas-Saint-Laurent (Rimouski), Quebec.
**Usage** : ~3 evenements/an par club, app active ~3 mois/an.
**Localisation** : Canada (Quebec), donnees hebergees a Montreal.
**Nom** : BSL Plume (domaine : bsl-plume.quebec)

---

## Stack Technique

### Choix valides

| Brique | Choix | Justification | Cout |
|--------|-------|---------------|------|
| **Framework** | Next.js 16 + React 19 | Deja en place, RSC, Server Actions, standalone output | Gratuit |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Design system accessible, theming par club | Gratuit |
| **Auth** | Better Auth | Open-source, self-hosted, vit dans la DB, zero vendor lock-in | Gratuit |
| **Anti-bot** | Cloudflare Turnstile | Privacy-friendly, moderne | Gratuit |
| **Database** | Supabase PostgreSQL (region Montreal) | Realtime inclus, free tier suffisant pour 3 events/an | Gratuit |
| **Realtime** | Supabase Realtime (via abstraction) | 200 conn. simultanees, suffisant pour tournoi club | Gratuit |
| **ORM** | Drizzle ORM (pas le client Supabase) | Type-safe, leger, portabilite DB garantie | Gratuit |
| **Monorepo** | Turborepo | Caching intelligent, parallel tasks | Gratuit |
| **Tests** | Vitest + Testing Library + Playwright + MSW | TDD complet, pyramide de tests | Gratuit |
| **i18n** | next-intl | FR/EN, type-safe, App Router compatible | Gratuit |
| **Deploiement** | Vercel Hobby (region Montreal yul1) | Optimise Next.js, preview deploys | Gratuit |
| **CI/CD** | GitHub Actions | Lint + Typecheck + Tests sur chaque PR | Gratuit |
| **PWA** | next-pwa / Serwist | Push notifications, install mobile | Gratuit |
| **Email** | Resend (free tier: 3K/mois) | Notifications email | Gratuit |

**Cout total : 0$/an** (+10-15$ CAD pour un domaine .ca ou .quebec)

### Supabase Free Tier & Usage 3 events/an

| Limite | Valeur | Besoin reel | Verdict |
|--------|--------|-------------|---------|
| Database | 500 MB | ~50-100 MB (joueurs + matchs + scores) | Large |
| Realtime | 200 conn. simultanees | ~50-100 pendant un tournoi | OK |
| MAU Auth | 50K | ~100-300 joueurs/an | Large |
| Bandwidth | 5 GB/mois | Suffisant pour un weekend | OK |
| Pause apres 7j inactivite | Auto | **Feature** : pause naturelle entre les events | Parfait |

```
Cycle annuel :

     Jan  Fev  Mar  Avr  Mai  Jun  Jul  Aou  Sep  Oct  Nov  Dec
     ──────────────────────────────────────────────────────────────
DB   💤   💤   💤  🟢🟢🟢  💤   💤   💤  🟢🟢🟢  💤  🟢🟢🟢
Web  ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅   ✅
                       Event 1            Event 2       Event 3

💤 = Supabase en pause (donnees conservees, 0$ consomme)
🟢 = Actif (un-pause en 1 clic, ~60 secondes)
✅ = Vercel toujours dispo (landing page, resultats passes)
```

**Workflow par event** :
1. 2 semaines avant → Un-pause Supabase (1 clic)
2. Ouvrir les inscriptions
3. Event actif → scores, temps reel
4. 1 semaine apres → export resultats en statique
5. Supabase se met en pause tout seul apres 7j

---

## Strategie anti lock-in (portabilite)

Principe : **utiliser Supabase comme infrastructure, pas comme framework**.

| Brique | Regle | Migration si besoin |
|--------|-------|---------------------|
| **DB** | Drizzle ORM uniquement (jamais `supabase.from()`) | `pg_dump` + changer `DATABASE_URL` |
| **Auth** | Better Auth (pas Supabase Auth) | Suit la DB automatiquement |
| **Realtime** | Interface `RealtimeProvider` abstraite | Changer 1 import (Supabase → Socket.io) |
| **Hosting** | Next.js `output: 'standalone'` | Deployer n'importe ou (Coolify, Docker) |
| **Business logic** | `tournament-engine` = zero dependance | Portable partout |

### Interface Realtime (abstraction)

```typescript
// packages/realtime/src/types.ts

type RealtimeEvent =
  | { type: "match:started"; matchId: string }
  | { type: "match:ended"; matchId: string; score: Score }
  | { type: "bracket:updated"; bracketId: string }

interface RealtimeProvider {
  subscribe(channel: string, cb: (event: RealtimeEvent) => void): () => void
  publish(channel: string, event: RealtimeEvent): Promise<void>
}
```

```typescript
// Aujourd'hui (1 fichier)
export const realtime: RealtimeProvider = createSupabaseRealtime(client)

// Migration future (changer 1 ligne)
export const realtime: RealtimeProvider = createSocketIORealtime(client)
```

### Scenario de migration vers VPS (~1 heure)

```
1. Creer VPS OVH Beauharnois, QC (~12$ CAD/mois)    → 30 min
2. Installer Coolify (PaaS open-source)               → inclus
3. pg_dump Supabase → pg_restore VPS PostgreSQL        → 15 min
4. Changer DATABASE_URL + import RealtimeProvider      → 10 min
5. Git push → deploy via Coolify                       → 5 min
```

### Plans de scaling si l'app grandit

| Situation | Solution | Cout |
|-----------|----------|------|
| +200 spectateurs en ligne sur 1 event | Upgrade Supabase Pro pour 1 mois | ~35$ CAD |
| Besoin de WebSocket illimite | VPS OVH Beauharnois + Socket.io | ~12$ CAD/mois |
| Multi-club, usage continu | VPS OVH Essential + Coolify | ~12$ CAD/mois |
| Gros tournoi regional | Supabase Pro 1 mois OU VPS temporaire | ~12-35$ CAD |

---

## Architecture Fonctionnelle

### Multi-tenant (Multi-club)

Chaque club est un tenant isole. Les donnees sont separees par `club_id`.

```
┌─────────────────────────────────────────────────┐
│  App (unique instance)                          │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────┐│
│  │ Club Rimouski │  │ Club Matane  │  │ Club X ││
│  │ /rimouski     │  │ /matane      │  │ /x     ││
│  │              │  │              │  │        ││
│  │ Tournois     │  │ Tournois     │  │ ...    ││
│  │ Joueurs      │  │ Joueurs      │  │        ││
│  │ Admins       │  │ Admins       │  │        ││
│  └──────────────┘  └──────────────┘  └────────┘│
│                                                 │
│  DB unique, isolation par club_id               │
│  Un joueur peut etre inscrit dans plusieurs clubs│
└─────────────────────────────────────────────────┘
```

**Strategie d'isolation** : Row-Level Security (RLS) via `club_id` sur chaque table.
**URL pattern** : `app.com/[club-slug]/tournois/...`
**Super Admin** : Role supplementaire pour gerer les clubs (creation, moderation).

### Roles Utilisateurs

| Role | Scope | Permissions |
|------|-------|------------|
| **Visiteur** | Global | Voir resultats publics, calendrier, s'inscrire |
| **Joueur** | Multi-club | S'inscrire a un tournoi, voir son calendrier, suivre en temps reel, preferences notifications |
| **Admin Club** | 1 club | CRUD tournois, tableaux, scores, gestion joueurs, terrains, cas speciaux (WO, abandon, blessure, DQ) |
| **Super Admin** | Global | Creer/gerer les clubs, moderation, statistiques globales |

### Format de Competition (MVP)

**Phase de poules** → **Elimination directe**

- Poules de N joueurs (round-robin)
- Les premiers de chaque poule qualifies pour le tableau final
- Repechage des meilleur(s) deuxieme(s) si pas assez de joueurs pour un tableau complet
- Elimination directe pour le tableau final

### Categories (par tableau)

| Code | Nom |
|------|-----|
| SH | Simple Homme |
| SD | Simple Dame |
| DH | Double Homme |
| DD | Double Dame |
| DX | Double Mixte |

> Pas de classement officiel. Classement club possible en v2.

### Inscription - Regles

- Admin ouvre les inscriptions avec : **nombre max de joueurs** + **deadline**
- Anti-bot Turnstile sur le formulaire
- **Simples** : le joueur s'inscrit seul
- **Doubles** : 2 modes
  - Admin cree la paire manuellement
  - Joueur s'inscrit avec son partenaire (1 seul compte, fournit l'email du partenaire)
  - Si l'email du partenaire existe → auto-link au compte

### Gestion des Terrains (Courts)

- Suggestion automatique de terrain disponible
- L'admin ouvre/ferme les terrains manuellement
- Attribution finale par l'admin

### Notifications

| Canal | Implementation |
|-------|---------------|
| **Temps reel (app)** | Supabase Realtime (via RealtimeProvider) |
| **Push notification** | PWA Service Worker + Web Push API |
| **Email** | Resend free tier |

L'utilisateur choisit ses preferences de notification dans son profil.

### Temps Reel - Granularite

| Evenement | Diffusion |
|-----------|-----------|
| Match demarre | Mise a jour statut → "en cours" |
| Match termine | Score final + progression tableau |
| Tableau mis a jour | Nouveau match planifie |
| Prochain match d'un joueur | Notification personnalisee |

> Pas de score point par point. Mise a jour a chaque fin/debut de match.

### Design / UX

| Aspect | Decision |
|--------|----------|
| **Theme** | Sombre / Clair / Auto |
| **Personnalisation** | Couleurs/logo par club |
| **Responsive** | Mobile-first |
| **Accessibilite** | WCAG 2.1 AA |
| **Langues** | FR / EN |

---

## Modele de Donnees

```
User (Better Auth managed)
  ├── id, email, name
  ├── avatar_url
  ├── locale (fr/en)
  └── notification_preferences (JSON: email, push, realtime)

Club
  ├── id, name, slug (unique, for URL: /rimouski, /matane)
  ├── logo_url
  ├── primary_color, secondary_color
  ├── description, location
  └── created_at

ClubMembership (multi-club support)
  ├── id, user_id, club_id
  ├── role (player/admin/super_admin)
  └── joined_at

Tournament
  ├── id, club_id, name, description
  ├── location, start_date, end_date
  ├── registration_start, registration_end
  ├── status (draft/registration_open/registration_closed/in_progress/completed/cancelled)
  └── settings (JSON: rules, court_count)

Category
  ├── id, tournament_id
  ├── type (SH/SD/DH/DD/DX)
  ├── max_players
  └── status (open/closed/in_progress/completed)

Player (profile linked to User)
  ├── id, user_id
  ├── first_name, last_name
  ├── birth_date, club
  └── license_number (optional)

Registration
  ├── id, player_id, category_id
  ├── partner_id (nullable, for doubles)
  ├── partner_email (nullable, for auto-link)
  ├── status (pending/confirmed/rejected/withdrawn)
  └── registered_at

Pool (Poule)
  ├── id, category_id, name (A, B, C...)
  ├── status (pending/in_progress/completed)
  └── size

PoolEntry
  ├── id, pool_id
  ├── player_id (or team_id for doubles)
  ├── wins, losses, points_for, points_against
  ├── rank (calculated)
  └── qualified (boolean)

Bracket (Tableau elimination directe)
  ├── id, category_id
  ├── type (main/consolation)
  ├── round_count
  └── status (pending/in_progress/completed)

Match
  ├── id
  ├── pool_id (nullable) OR bracket_id (nullable)
  ├── round, position
  ├── participant1_id, participant2_id
  ├── score_set1, score_set2, score_set3
  ├── status (scheduled/in_progress/completed/walkover/retired/disqualified)
  ├── winner_id
  ├── court_number
  ├── scheduled_time, started_at, ended_at
  └── next_match_id (for bracket progression)

Court
  ├── id, tournament_id
  ├── number, name
  ├── status (available/in_use/closed)
  └── current_match_id (nullable)

Notification
  ├── id, user_id
  ├── type (match_starting/match_ended/registration_confirmed/etc)
  ├── title, body
  ├── read (boolean)
  ├── channels_sent (JSON: email, push, realtime)
  └── created_at
```

### Relations cles

```
User 1──N ClubMembership (un joueur peut etre dans plusieurs clubs)
ClubMembership N──1 Club
Club 1──N Tournament
Tournament 1──N Category
Category 1──N Pool
Category 1──1 Bracket (main)
Pool 1──N PoolEntry
Pool 1──N Match (pool matches)
Bracket 1──N Match (bracket matches)
Tournament 1──N Court
User 1──1 Player
Player 1──N Registration
Registration N──1 Category
```

---

## Structure Monorepo

```
bsl-app/
├── apps/
│   └── web/                    # Next.js 16 app
│       ├── src/
│       │   ├── app/            # App Router (pages, layouts, API routes)
│       │   │   ├── [locale]/   # i18n routing (fr/en)
│       │   │   ├── api/        # API routes (Better Auth, webhooks)
│       │   │   └── admin/      # Admin dashboard
│       │   ├── components/     # App-specific components
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # App utilities
│       │   └── styles/         # Global styles
│       ├── public/
│       ├── messages/           # i18n translation files (fr.json, en.json)
│       └── tests/
│           ├── unit/
│           ├── integration/
│           └── e2e/            # Playwright tests
├── packages/
│   ├── db/                     # Drizzle schema, migrations, seed, queries
│   │   ├── src/
│   │   │   ├── schema/         # Table definitions
│   │   │   ├── migrations/     # SQL migrations
│   │   │   ├── queries/        # Reusable query builders
│   │   │   └── seed/           # Test/dev data
│   │   └── tests/              # Schema & query tests
│   ├── auth/                   # Better Auth config & utilities
│   ├── realtime/               # RealtimeProvider interface + implementations
│   │   ├── src/
│   │   │   ├── types.ts        # RealtimeProvider interface, RealtimeEvent types
│   │   │   ├── supabase.ts     # Supabase Realtime implementation (current)
│   │   │   └── socketio.ts     # Socket.io implementation (future migration)
│   │   └── tests/
│   ├── ui/                     # Shared UI components (shadcn/ui base)
│   ├── validators/             # Zod schemas (shared between client/server)
│   ├── tournament-engine/      # Core business logic (pure functions, TDD)
│   │   ├── src/
│   │   │   ├── pool.ts         # Pool generation, ranking, qualification
│   │   │   ├── bracket.ts      # Bracket generation, progression
│   │   │   ├── scoring.ts      # Score validation, match result
│   │   │   ├── court.ts        # Court assignment logic
│   │   │   └── types.ts        # Domain types
│   │   └── tests/              # Extensive unit tests (TDD)
│   └── config/                 # Shared configs (typescript, tailwind)
├── turbo.json
├── package.json
└── .github/
    └── workflows/
        └── ci.yml              # Lint + Typecheck + Test + E2E
```

> **`tournament-engine`** = coeur metier. 100% logique pure, zero dependance.
> **`realtime`** = abstraction pour portabilite. Swap d'implementation en 1 ligne.

---

## Strategie de Test (TDD)

### Pyramide de Tests

```
          ┌─────────┐
          │  E2E    │  Playwright (flux critiques)
          │ (few)   │  - Inscription complete
         ┌┴─────────┴┐  - Saisie score admin
         │Integration │  - Suivi temps reel
         │ (some)     │
        ┌┴────────────┴┐  Vitest + MSW
        │  Unit Tests   │  - API routes
        │  (many)       │  - Composants avec context
       ┌┴───────────────┴┐
       │  tournament-engine │  Vitest (pure functions)
       │  (extensive)       │  - Pool generation
       └────────────────────┘  - Bracket logic
                               - Score validation
                               - Court assignment
```

### Regles TDD

1. **Red** : Ecrire le test qui echoue
2. **Green** : Ecrire le minimum de code pour passer
3. **Refactor** : Nettoyer sans casser les tests

### Couverture Cible

| Package | Couverture min |
|---------|---------------|
| `tournament-engine` | 95% |
| `validators` | 90% |
| `db` (queries) | 85% |
| `realtime` | 85% |
| `web` (composants) | 75% |
| E2E (flux critiques) | 100% des user stories MVP |

---

## Flux Utilisateur (MVP)

### 1. Admin cree un tournoi

```
Admin → Dashboard → "Nouveau tournoi"
  → Nom, dates, lieu, nombre de terrains
  → Ajouter categories (SH, SD, DH, DD, DX)
  → Definir max joueurs + deadline par categorie
  → Publier → statut "registration_open"
```

### 2. Joueur s'inscrit

```
Visiteur → Page tournoi → "S'inscrire"
  → Turnstile check
  → Creer compte (Better Auth) ou login
  → Choisir categorie(s)
  → Si double : ajouter email partenaire
  → Confirmation → statut "pending"
  → Admin confirme → statut "confirmed"
```

### 3. Admin lance le tournoi

```
Admin → Cloturer inscriptions
  → Generer poules (automatique avec validation manuelle)
  → Attribuer terrains
  → Lancer phase de poules
```

### 4. Phase de poules

```
Admin → Selectionner match → Saisir score
  → Score valide (21 pts, 2 sets gagnants)
  → Classement poule mis a jour automatiquement
  → Tous les matchs de poule termines
  → Qualification automatique (1ers + meilleurs 2emes)
  → Generation tableau elimination directe
```

### 5. Elimination directe

```
Admin → Saisir scores
  → Progression automatique du vainqueur
  → Finale → Vainqueur du tournoi
  → Resultats finaux publies
```

### 6. Suivi joueur (temps reel)

```
Joueur → Dashboard
  → "Mes prochains matchs" (terrain, heure, adversaire)
  → Notification quand son match approche
  → Voir l'etat du tableau en direct
```

---

## Hebergement & Localisation

### Infrastructure actuelle (gratuite)

| Service | Region | Localisation | Cout |
|---------|--------|-------------|------|
| **Vercel** | yul1 | **Montreal, QC** | Gratuit |
| **Supabase** | AWS ca-central-1 | **Montreal, QC** | Gratuit |
| **Resend** | - | US | Gratuit |
| **Cloudflare Turnstile** | Edge global | CDN | Gratuit |
| **GitHub Actions** | - | US | Gratuit |

> 100% des donnees utilisateur hebergees a Montreal, Quebec.
> Conforme a la Loi 25 du Quebec sur la protection des renseignements personnels.

### Chemin de migration (si besoin)

| Etape | Declencheur | Cible | Cout |
|-------|-------------|-------|------|
| **Actuel** | - | Supabase Free + Vercel Hobby (Montreal) | 0$/an |
| **Scaling ponctuel** | 1 gros event | Supabase Pro pour 1 mois | ~35$ CAD |
| **VPS permanent** | Multi-club, usage continu | OVH Beauharnois QC + Coolify | ~12$ CAD/mois |

---

## Prochaines Etapes (ordre d'implementation)

| Phase | Tache | Approche |
|-------|-------|----------|
| **0** | Setup monorepo Turborepo | Migration structure actuelle |
| **1** | Setup Supabase + Drizzle schema | Schema + migrations + seed |
| **2** | Setup Better Auth + Turnstile | Auth + anti-bot + roles |
| **3** | `tournament-engine` (TDD) | Logique metier pure, tests d'abord |
| **4** | `realtime` package (abstraction) | Interface + implementation Supabase |
| **5** | CRUD Tournois (admin) | Server Actions + UI admin |
| **6** | Systeme d'inscription | Formulaire joueur + validation |
| **7** | Generation poules + tableau | Algo + UI bracket |
| **8** | Saisie scores (admin) | UI rapide + validation |
| **9** | Temps reel | Supabase Realtime via RealtimeProvider |
| **10** | Notifications (email + push) | Preferences utilisateur |
| **11** | i18n (FR/EN) | next-intl setup |
| **12** | PWA | Service worker + manifest |
| **13** | Theming par club | CSS variables + config |
| **14** | CI/CD GitHub Actions | Pipeline complete |

---

## Seed Data & Donnees de Test

Pas de donnees reelles. Generateur realiste avec **@faker-js/faker**.

### Strategie de generation

```
packages/db/src/seed/
  ├── generators/
  │   ├── clubs.ts          # 3-5 clubs BSL (Rimouski, Matane, Riviere-du-Loup...)
  │   ├── players.ts        # 50-200 joueurs avec noms quebecois realistes
  │   ├── tournaments.ts    # Tournois avec dates, categories, parametres
  │   ├── registrations.ts  # Inscriptions avec distribution realiste
  │   ├── pools.ts          # Poules generees avec matchs
  │   ├── brackets.ts       # Tableaux avec progression
  │   ├── matches.ts        # Scores realistes (21 pts, sets)
  │   └── index.ts          # Orchestration seed complet
  └── scenarios/
      ├── empty-club.ts     # Club cree, aucun tournoi
      ├── registration-open.ts  # Tournoi avec inscriptions en cours
      ├── pools-in-progress.ts  # Phase de poules en cours
      ├── bracket-final.ts      # Elimination directe, demi-finales
      └── completed.ts          # Tournoi termine avec resultats
```

### Donnees realistes

- **Noms** : Faker.js locale `fr_CA` (noms quebecois)
- **Clubs BSL** : Rimouski, Matane, Riviere-du-Loup, Amqui, Temiscouata
- **Scores** : Algorithme de scores badminton realistes (21 pts, avantage a 20-20, max 30-29)
- **Distribution** : Repartition realiste des joueurs par categorie (plus de SH/SD que de DX)
- **Scenarios** : Chaque scenario = un etat precis de l'app pour tester un flux specifique

### Commandes seed

```bash
pnpm db:seed                    # Seed complet (tous les scenarios)
pnpm db:seed --scenario empty   # Un scenario specifique
pnpm db:seed --reset            # Reset + reseed
```

---

## Questions Resolues

| # | Question | Reponse |
|---|----------|---------|
| 1 | Nom de l'app | **BSL Plume** (bsl-plume.quebec) |
| 2 | Multi-club | Oui, multi-tenant des le debut, isolation par club_id |
| 3 | Seed data | Generateur Faker.js avec scenarios realistes BSL |
| 4 | Domaine | Pas encore, a choisir apres le nom (suggestions : .ca ou .quebec) |

## Questions Restantes

Aucune question bloquante. Pret pour l'implementation.
