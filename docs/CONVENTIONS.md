# BSL Plume - Conventions & Coding Rules

Rules for the BSL Plume codebase. All contributors (human and AI) must follow these.

---

## TypeScript

### Strict rules

- **Strict mode** : always (`strict: true` in tsconfig)
- **No `any`** : never, ever. Use `unknown` + type narrowing, generics, or Zod inference
- **No enums** : use `as const` objects + union types instead
- **No type assertions** (`as`) : except for test setup. Prefer type guards
- **No non-null assertions** (`!`) : handle null/undefined explicitly
- **Explicit return types** : on exported functions and public APIs
- **Infer types from schemas** : Zod schemas are the source of truth, derive TypeScript types from them

```typescript
// Enums — NO
enum Status { Draft, Open }

// as const — YES
const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  REGISTRATION_OPEN: "registration_open",
  REGISTRATION_CLOSED: "registration_closed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const

type TournamentStatus = typeof TOURNAMENT_STATUS[keyof typeof TOURNAMENT_STATUS]
```

```typescript
// any — NO
function process(data: any) { ... }

// unknown + narrowing — YES
function process(data: unknown) {
  const parsed = tournamentSchema.parse(data)
  // parsed is fully typed
}
```

### Type organization

- **Domain types** : in `packages/tournament-engine/src/types.ts`
- **DB types** : inferred from Drizzle schema (`typeof table.$inferSelect`)
- **Validation types** : inferred from Zod schemas (`z.infer<typeof schema>`)
- **API types** : inferred from validators, shared via `packages/validators/`
- **No duplicate type definitions** : one source of truth per type

---

## Naming

### Files & folders

| Element | Convention | Example |
|---------|-----------|---------|
| Folders | kebab-case | `tournament-engine/`, `club-settings/` |
| TypeScript files | kebab-case | `pool-generator.ts`, `match-score.ts` |
| React components | kebab-case file, PascalCase export | `bracket-view.tsx` → `export function BracketView()` |
| Test files | co-located, `.test.ts` suffix | `pool-generator.test.ts` |
| Next.js special files | lowercase (framework convention) | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` |
| Zod schemas | kebab-case, `.schema.ts` suffix | `tournament.schema.ts` |
| Constants | kebab-case file, SCREAMING_SNAKE_CASE export | `match-status.ts` → `MATCH_STATUS` |

### Code

| Element | Convention | Example |
|---------|-----------|---------|
| Variables & functions | camelCase | `getPoolRankings()`, `matchScore` |
| Types & interfaces | PascalCase | `Tournament`, `MatchResult` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_POOL_SIZE`, `MATCH_STATUS` |
| Boolean variables | `is/has/can/should` prefix | `isCompleted`, `hasPartner`, `canRegister` |
| Event handlers | `on` prefix | `onMatchEnd`, `onScoreSubmit` |
| React hooks | `use` prefix | `useTournament()`, `useRealtimeMatch()` |
| DB table names | snake_case plural | `tournaments`, `pool_entries`, `club_memberships` |
| DB column names | snake_case | `start_date`, `club_id`, `court_number` |
| URL slugs | kebab-case | `/rimouski/tournois/open-2026` |

---

## Project structure rules

### Monorepo boundaries

```
packages/tournament-engine/  → ZERO external dependencies. Pure logic only.
                               No DB, no HTTP, no framework imports.
                               Only depends on: its own types.

packages/validators/          → Only depends on: zod.
                               Shared between client and server.

packages/db/                  → Only depends on: drizzle-orm, pg driver.
                               Exports schemas, queries, types.
                               No business logic.

packages/realtime/            → Only depends on: its own interface.
                               Implementations import specific SDKs.

packages/auth/                → Only depends on: better-auth, packages/db.

packages/ui/                  → Only depends on: react, tailwind, class-variance-authority.
                               No business logic, no data fetching.

apps/web/                     → Imports from all packages.
                               Glues everything together.
```

### Import rules

```typescript
// Cross-package imports — use package names
import { generatePools } from "@bsl-plume/tournament-engine"
import { tournamentSchema } from "@bsl-plume/validators"
import { db } from "@bsl-plume/db"

// Within a package — use relative imports
import { calculateRanking } from "./ranking"

// NEVER import from another package's internals
import { something } from "@bsl-plume/db/src/internal/thing"  // NO
```

### Package naming

All packages use the `@bsl-plume/` scope :
- `@bsl-plume/tournament-engine`
- `@bsl-plume/db`
- `@bsl-plume/auth`
- `@bsl-plume/realtime`
- `@bsl-plume/validators`
- `@bsl-plume/ui`
- `@bsl-plume/config`

---

## React & Next.js

### Server vs Client components

```
DEFAULT = Server Component (no directive needed)

'use client' ONLY when:
  - Using hooks (useState, useEffect, useContext...)
  - Using browser APIs (localStorage, window...)
  - Using event handlers (onClick, onChange...)
  - Using Supabase Realtime subscriptions
  - Interactive UI (forms, modals, dropdowns)

NEVER 'use client' on:
  - Layout components (unless they need client state)
  - Page components (fetch data on server)
  - Data display components
```

### Data patterns

```typescript
// Data fetching — Server Components + Drizzle (NEVER in useEffect)
// app/[locale]/[club-slug]/tournois/page.tsx
export default async function TournamentsPage({ params }: Props) {
  const tournaments = await getTournamentsByClub(params.clubSlug)
  return <TournamentList tournaments={tournaments} />
}

// Mutations — Server Actions
// app/[locale]/[club-slug]/tournois/actions.ts
"use server"
export async function createTournament(formData: FormData) {
  const data = createTournamentSchema.parse(Object.fromEntries(formData))
  // validate, insert, revalidate
}

// Realtime — Client Component + RealtimeProvider
// components/live-bracket.tsx
"use client"
export function LiveBracket({ bracketId }: Props) {
  useRealtimeSubscription(`bracket:${bracketId}`, (event) => {
    // update local state
  })
}
```

### Component patterns

- **Composition over props** : use `children` and slots, not giant prop objects
- **Single responsibility** : one component = one job
- **Co-locate** : keep component + hook + test together when they're specific
- **No prop drilling** : use React Context for deep state, Server Components for data

```
components/
  bracket/
    bracket-view.tsx          # Main component
    bracket-view.test.tsx     # Tests
    bracket-match-card.tsx    # Sub-component
    use-bracket-data.ts       # Hook (if client)
```

---

## Database (Drizzle)

### Schema rules

- All tables have `id` (UUID v7, auto-generated), `created_at`, `updated_at`
- All foreign keys have explicit `onDelete` behavior
- All multi-tenant tables have `club_id` column
- Use Drizzle relations for type-safe joins
- Index all foreign keys and commonly queried fields

```typescript
// packages/db/src/schema/tournaments.ts
export const tournaments = pgTable("tournaments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  // ...
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tournaments_club_id_idx").on(table.clubId),
  index("tournaments_status_idx").on(table.status),
])
```

### Query rules

- **Never use raw SQL** in app code (only in migrations)
- **Never use `supabase.from()`** — always Drizzle
- Queries live in `packages/db/src/queries/`
- One file per domain : `tournament-queries.ts`, `match-queries.ts`
- All queries are functions that take `db` as parameter (testable)

```typescript
// YES — injectable, testable
export function getTournamentsByClub(db: Database, clubId: string) {
  return db.select().from(tournaments).where(eq(tournaments.clubId, clubId))
}

// NO — hardcoded dependency
export function getTournamentsByClub(clubId: string) {
  return globalDb.select().from(tournaments).where(eq(tournaments.clubId, clubId))
}
```

---

## Testing (TDD)

### Rules

1. **Write the test FIRST** (Red → Green → Refactor)
2. **One assertion per test** when possible, grouped by behavior
3. **Test behavior, not implementation** — test what it does, not how
4. **No mocking of internal modules** — only mock external boundaries (DB, HTTP, Realtime)
5. **Descriptive test names** : `it("should qualify the best second-place player when pool is uneven")`

### Structure

```typescript
describe("generatePools", () => {
  describe("when given 12 players for 4 pools", () => {
    it("should create 4 pools of 3 players", () => { ... })
    it("should distribute seeded players across pools", () => { ... })
    it("should not place players from same club in same pool", () => { ... })
  })

  describe("when given an odd number of players", () => {
    it("should create uneven pools with max 1 player difference", () => { ... })
  })

  describe("edge cases", () => {
    it("should throw when fewer than 4 players", () => { ... })
    it("should create 1 pool when 3 or fewer players", () => { ... })
  })
})
```

### Test file location

```
packages/tournament-engine/
  src/
    pool-generator.ts
    pool-generator.test.ts      # Co-located with source
    bracket-generator.ts
    bracket-generator.test.ts

apps/web/
  tests/
    e2e/                        # Playwright E2E tests (separate)
      registration.spec.ts
      admin-scoring.spec.ts
```

### Test data

- Use factory functions, not fixtures
- Factories live in `packages/db/src/seed/generators/`
- Tests use the same factories as seed data

```typescript
// packages/db/src/seed/generators/players.ts
export function createPlayer(overrides?: Partial<Player>): Player {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides,
  }
}

// In tests
const player = createPlayer({ club: "Rimouski" })
```

---

## Error handling

### Rules

- **Fail fast** : validate inputs at system boundaries (API routes, Server Actions)
- **Typed errors** : use discriminated unions, not generic Error
- **No try/catch for flow control** : only for actual error recovery
- **Zod for validation** : parse at the boundary, trust internally

```typescript
// Typed results — YES
type MatchResult =
  | { success: true; match: Match }
  | { success: false; error: "INVALID_SCORE" | "MATCH_NOT_FOUND" | "ALREADY_COMPLETED" }

export function submitScore(matchId: string, score: Score): MatchResult {
  // ...
}

// Generic throws — AVOID in business logic
export function submitScore(matchId: string, score: Score): Match {
  throw new Error("something went wrong")  // NO — untyped, hard to handle
}
```

### Server Actions error pattern

```typescript
"use server"

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function createTournament(formData: FormData): Promise<ActionResult<Tournament>> {
  const parsed = createTournamentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors }
  }
  // ...
}
```

---

## Git

### Branch naming

```
feature/[short-description]     # feature/pool-generation
fix/[short-description]         # fix/score-validation-edge-case
chore/[short-description]       # chore/setup-turborepo
```

### Commit messages

Conventional Commits format :

```
type(scope): description

feat(tournament-engine): add pool generation with seeding
fix(db): correct match progression foreign key
test(tournament-engine): add edge cases for uneven pools
chore(monorepo): setup turborepo workspaces
docs(brainstorm): update architecture decisions
```

Types : `feat`, `fix`, `test`, `chore`, `docs`, `refactor`, `perf`, `ci`
Scopes : `tournament-engine`, `db`, `auth`, `realtime`, `ui`, `validators`, `web`, `monorepo`, `ci`

---

## Comments

- **Language** : English only
- **When** : only when the "why" is not obvious from the code
- **Never** : comment what the code does (the code speaks for itself)
- **TODO** : `// TODO(scope): description` — must reference an issue or be addressed before merge
- **JSDoc** : on exported public APIs of packages only

```typescript
// NO — describes what
// Loop through players and filter by club
const clubPlayers = players.filter(p => p.club === clubId)

// YES — describes why
// BWF rules: max 2 players from same club per pool to ensure fair distribution
const maxSameClub = 2
```

---

## Internationalization (i18n)

- **Translation keys** : dot-notation, grouped by feature
- **No hardcoded strings** in components (except dev/debug)
- **Namespace per feature** : `tournament.create.title`, `registration.form.submit`

```json
{
  "tournament": {
    "create": {
      "title": "New Tournament",
      "submit": "Create Tournament"
    },
    "status": {
      "draft": "Draft",
      "registration_open": "Registration Open"
    }
  }
}
```

---

## Accessibility (WCAG 2.1 AA)

- All interactive elements must be keyboard-navigable
- All images/icons have meaningful alt text or `aria-label`
- Color contrast ratio minimum 4.5:1 (text), 3:1 (large text/UI)
- Form inputs always have associated labels
- Error messages linked to inputs via `aria-describedby`
- Focus management on route changes and modal open/close
- Use semantic HTML (`<main>`, `<nav>`, `<article>`, `<button>`, not `<div onClick>`)

---

## Performance rules

- **No barrel files** (`index.ts` re-exporting everything) in large packages — causes bundle bloat
- **Dynamic imports** for heavy components (bracket visualizer, chart components)
- **Image optimization** : use `next/image` always
- **Minimize 'use client'** : keep client components as leaf nodes
- **No unnecessary re-renders** : memoize expensive computations, not everything
