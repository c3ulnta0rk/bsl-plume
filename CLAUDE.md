# BSL Plume - Project Rules

## Project

Badminton tournament management app (BSL Plume — bsl-plume.quebec).
Multi-club, multi-tenant, mobile-first, FR/EN, WCAG 2.1 AA.
Region: Bas-Saint-Laurent, Rimouski, Quebec, Canada.

## Stack

- Next.js 16 (App Router, RSC, Server Actions, standalone output)
- React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui
- Drizzle ORM (never `supabase.from()`)
- Better Auth (self-hosted, lives in DB)
- Supabase PostgreSQL (region Montreal) with Realtime via abstraction layer
- Turborepo monorepo, packages scoped `@bsl-plume/*`
- Vitest + Testing Library + Playwright + MSW (TDD)
- next-intl (FR/EN), Resend (email), Cloudflare Turnstile (anti-bot)
- Vercel Hobby (region Montreal yul1)

## Critical rules

- **No `any`** in TypeScript, ever. Use `unknown`, generics, or Zod inference.
- **No enums** — use `as const` objects + union types.
- **Comments in English only.**
- **Write tests FIRST** (TDD: Red → Green → Refactor).
- **Server Components by default** — `'use client'` only when hooks/interactivity needed.
- **Drizzle only for DB** — never use `supabase.from()` (portability).
- **Zod schemas are the source of truth** — infer TypeScript types from them.
- **Typed errors** — use discriminated unions, not generic Error throws.
- **Queries take `db` as parameter** — injectable, testable.

## Naming

- Files/folders: kebab-case (`pool-generator.ts`)
- React exports: PascalCase (`export function BracketView()`)
- Variables/functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- DB tables: snake_case plural, columns: snake_case
- Booleans: `is/has/can/should` prefix
- Test files: co-located `.test.ts` suffix

## Architecture

- `packages/tournament-engine/` — ZERO dependencies, pure business logic
- `packages/db/` — Drizzle schemas + queries, no business logic
- `packages/validators/` — Zod schemas, shared client/server
- `packages/realtime/` — RealtimeProvider interface (swap Supabase/Socket.io)
- `packages/auth/` — Better Auth config
- `packages/ui/` — shadcn/ui components, no data fetching
- `apps/web/` — Next.js app, glues everything together

## Conventions

Full conventions documented in `docs/CONVENTIONS.md`.
Full architecture documented in `docs/BRAINSTORM.md`.
