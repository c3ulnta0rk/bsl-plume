import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { forbidden, HttpError, notFound, type Ctx } from './context'
import { schema } from './db'

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>
const { sessions, staff, tournaments, users } = schema

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(pw, salt, 64)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(hash: string, pw: string): Promise<boolean> {
  const [, s, k] = hash.split('$')
  if (!s || !k) return false
  const key = Buffer.from(k, 'base64')
  const got = await scryptAsync(pw, Buffer.from(s, 'base64'), key.length)
  return timingSafeEqual(key, got)
}

export type User = Pick<typeof users.$inferSelect, 'id' | 'email' | 'name'>
export type Env = { Variables: { ctx: Ctx, user: User | null, deviceId: string | null } }

export async function userFromToken(ctx: Ctx, token: string | undefined): Promise<User | null> {
  if (!token) return null
  const [row] = await ctx.db.select({ id: users.id, email: users.email, name: users.name }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.token, token))
  return row ?? null
}

export async function createSession(ctx: Ctx, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await ctx.db.insert(sessions).values({ token, userId })
  return token
}

export function requireUser(c: Context<Env>): User {
  const u = c.get('user')
  if (!u) throw new HttpError(401, 'Connectez-vous pour continuer.')
  return u
}

/** Vérifie que l'utilisateur organise ce tournoi (propriétaire, co-organisateur, ou table de marque si `scorer`). */
export async function requireStaff(c: Context<Env>, tournamentId: string, level: 'admin' | 'scorer' = 'admin') {
  const u = requireUser(c)
  const ctx = c.get('ctx')
  const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
  if (!t) throw notFound('Tournoi introuvable.')
  if (t.ownerId === u.id) return t
  const [s] = await ctx.db.select().from(staff).where(and(eq(staff.tournamentId, tournamentId), eq(staff.userId, u.id)))
  if (!s || (level === 'admin' && s.role !== 'admin')) throw forbidden('Vous n\'organisez pas ce tournoi.')
  return t
}
