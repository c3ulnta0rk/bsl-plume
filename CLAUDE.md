# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BSL-APP is a badminton tournament management system built with **Nuxt 4** (Vue 3 + TypeScript). It handles tournament creation, category/phase management, pool play, knockout brackets, match scoring, and club/user administration.

## Commands

```bash
pnpm dev              # Start dev server (SSR disabled in dev)
pnpm build            # Production build (SSR enabled)
pnpm lint             # ESLint with Nuxt stylistic rules
pnpm typecheck        # vue-tsc type checking
pnpm test             # Run all tests (vitest)
pnpm test:unit        # Unit tests only (test/unit/, node environment)
pnpm test:nuxt        # Nuxt integration tests (test/nuxt/, nuxt environment)
npx vitest run test/unit/utils/example.test.ts  # Run a single test file
npx tsx server/scripts/seed.ts                  # Seed database with test data
```

### Database Migrations (Drizzle)

The drizzle config is auto-generated at `.nuxt/hub/db/drizzle.config.ts`. You must run `nuxt prepare` first so the config exists:

```bash
pnpm postinstall                          # Runs nuxt prepare
npx drizzle-kit generate                  # Generate migration from schema changes
npx drizzle-kit migrate                   # Apply migrations
```

Migrations output to `server/db/migrations/postgresql/`.

## Architecture

### Stack

- **Framework**: Nuxt 4.3 (Vue 3 Composition API, `<script setup>`)
- **Database**: PostgreSQL via Drizzle ORM, connected through `@nuxthub/core`
- **Auth**: `nuxt-auth-utils` (scrypt hashing, cookie-based sessions)
- **UI**: `@nuxt/ui` v4 (Tailwind CSS 4), Lucide icons
- **State**: Pinia stores for reference data caching
- **i18n**: `@nuxtjs/i18n` with FR (default) and EN, `no_prefix` strategy
- **Testing**: Vitest with two projects (unit + nuxt environments)

### Database Layer

**Schema** (`server/db/schema/`): Each table has its own file exporting the Drizzle table definition plus inferred types:
```typescript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

**Casing**: snake_case in PostgreSQL columns, camelCase in TypeScript (configured in `nuxt.config.ts` hub.db.casing).

**IDs**: All primary keys are `text` using `crypto.randomUUID()`.

**Entity hierarchy**: clubs > tournaments > categories > phases > pools/matches > poolEntries/sets. Matches have a self-referencing `nextMatchId` for knockout bracket progression.

### Server Utilities Pattern

Each entity has a `server/utils/{entity}.ts` file with standardized CRUD functions:
```typescript
export async function getClubs() { ... }
export async function getClubById(id: string) { ... }
export async function createClub(data: { name: string }) { ... }
export async function updateClub(id: string, data: Partial<Club>) { ... }
export async function deleteClub(id: string) { ... }
```

DB access uses `import { db } from '@nuxthub/db'`. All queries use Drizzle query builder with `eq()` from `drizzle-orm`.

### API Structure

- `/api/auth/` - Public: register, login, logout
- `/api/admin/{entity}` - Protected CRUD (GET: session required, POST/PUT/DELETE: admin role)
- `/api/tournaments/` - Public: list published tournaments, view structure

Server middleware (`server/middleware/auth.ts`) enforces authorization on `/api/admin/*` routes.

### Frontend Patterns

**Composables**:
- `useAdminCrud<T>(entityPath)` - Generic CRUD operations against `/api/admin/{entityPath}`
- `useAdminAuth()` - Returns `{ user, loggedIn, isAdmin }`

**Pinia stores** (`app/stores/`): Simple fetch-and-cache pattern for dropdown/reference data (clubs, users, tournaments, categoryTypes).

**Admin components** (`app/components/admin/`): Reusable `AdminPageHeader`, `AdminDataTable`, `AdminFormModal`, `AdminDeleteConfirm`, `AdminStatusBadge`.

**Layouts**: `default` (public nav) and `admin` (sidebar nav with icons).

**Route middleware** (`app/middleware/admin.ts`): Protects `/admin/*` pages, redirects to `/signin` or `/` based on auth state.

### i18n

All user-facing text uses `t()` from `useI18n()`. Translation files are in `i18n/locales/{fr,en}.json`. Keys are organized by domain: `common`, `nav`, `auth`, `clubs`, `tournaments`, `matches`, etc.

## Coding Conventions

- Never use `any` in TypeScript
- Code comments in English
- ESLint stylistic: single quotes, no semicolons, no trailing commas, 1tbs brace style
- `<script setup lang="ts">` for all Vue components
- `definePageMeta` for route configuration (layout, middleware)
- `defineEventHandler` for API routes
- Error handling: `throw createError({ statusCode, message })` on server, try/catch on client
- Explicit undefined over null: `rows[0] ?? undefined`

## Environment Variables

```
DATABASE_URL=postgresql://...        # PostgreSQL connection string
NUXT_SESSION_PASSWORD=...            # 32+ chars, session encryption key
```
