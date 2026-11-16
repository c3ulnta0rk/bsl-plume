import { and, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { RULES_PRESETS } from '@plume/engine'
import { createSession, hashPassword, requireUser, verifyPassword, type Env } from '../auth'
import { bad, conflict, HttpError } from '../context'
import { schema } from '../db'
import { playerHistory } from '../services/history'
import { playerName } from '../services/names'
import { vapidKeys } from '../services/notify'
import { confirmRegistration, submitRegistration } from '../services/registrations'
import { buildSnapshot } from '../services/snapshot'

const { categories, follows, notifications, outbox, players, pushSubscriptions, registrations, sessions, staff, tournaments, users } = schema

export const person = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(60),
  lastName: z.string().trim().min(1, 'Nom requis').max(60),
  licence: z.string().trim().max(20).nullish(),
  club: z.string().trim().max(80).nullish(),
  gender: z.enum(['M', 'F']).nullish(),
  email: z.string().trim().email('Adresse mail invalide').nullish()
})

export function parse<T extends z.ZodType>(s: T, data: unknown): z.infer<T> {
  const r = s.safeParse(data)
  if (!r.success) throw bad(r.error.issues.map(i => i.message).join(' '))
  return r.data
}

export const publicRoutes = new Hono<Env>()

publicRoutes.post('/auth/register', async (c) => {
  const ctx = c.get('ctx')
  const b = parse(z.object({ email: z.string().trim().toLowerCase().email('Adresse mail invalide'), name: z.string().trim().min(2, 'Nom requis'), password: z.string().min(8, 'Mot de passe : 8 caractères minimum') }), await c.req.json())
  const [exists] = await ctx.db.select().from(users).where(eq(users.email, b.email))
  if (exists) throw conflict('Un compte existe déjà avec cette adresse.')
  const [u] = await ctx.db.insert(users).values({ email: b.email, name: b.name, passwordHash: await hashPassword(b.password) }).returning()
  // rattache les fiches joueur déjà créées avec cette adresse
  await ctx.db.update(players).set({ userId: u!.id }).where(and(eq(players.email, b.email), sql`${players.userId} is null`))
  return c.json({ token: await createSession(ctx, u!.id), user: { id: u!.id, email: u!.email, name: u!.name } })
})

publicRoutes.post('/auth/login', async (c) => {
  const ctx = c.get('ctx')
  const b = parse(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }), await c.req.json())
  const [u] = await ctx.db.select().from(users).where(eq(users.email, b.email))
  if (!u || !(await verifyPassword(u.passwordHash, b.password))) throw new HttpError(401, 'Adresse ou mot de passe incorrect.')
  return c.json({ token: await createSession(ctx, u.id), user: { id: u.id, email: u.email, name: u.name } })
})

publicRoutes.post('/auth/logout', async (c) => {
  const token = c.req.header('authorization')?.replace(/^Bearer /, '')
  if (token) await c.get('ctx').db.delete(sessions).where(eq(sessions.token, token))
  return c.json({ ok: true })
})

publicRoutes.get('/auth/me', async (c) => {
  const u = c.get('user')
  if (!u) return c.json({ user: null, playerIds: [] })
  const mine = await c.get('ctx').db.select({ id: players.id }).from(players).where(eq(players.userId, u.id))
  return c.json({ user: u, playerIds: mine.map(p => p.id) })
})

publicRoutes.get('/rules/presets', c => c.json(RULES_PRESETS))

publicRoutes.get('/tournaments', async (c) => {
  const ctx = c.get('ctx')
  const ts = await ctx.db.select().from(tournaments).where(ne(tournaments.status, 'draft')).orderBy(desc(tournaments.startDate))
  const counts = ts.length
    ? await ctx.db.select({ t: registrations.tournamentId, n: sql<number>`count(*)::int` }).from(registrations)
        .where(and(inArray(registrations.tournamentId, ts.map(t => t.id)), eq(registrations.status, 'accepted'))).groupBy(registrations.tournamentId)
    : []
  const cats = ts.length ? await ctx.db.select().from(categories).where(inArray(categories.tournamentId, ts.map(t => t.id))) : []
  return c.json(ts.map(t => ({
    id: t.id, slug: t.slug, name: t.name, clubName: t.clubName, location: t.location, startDate: t.startDate, endDate: t.endDate,
    status: t.status, registrationOpen: t.registrationOpen,
    entries: counts.find(x => x.t === t.id)?.n ?? 0,
    places: cats.filter(x => x.tournamentId === t.id).reduce((s, x) => s + x.maxEntries, 0),
    categories: cats.filter(x => x.tournamentId === t.id).length
  })))
})

publicRoutes.get('/tournaments/:slug', async (c) => {
  const ctx = c.get('ctx')
  const snap = await buildSnapshot(ctx.db, c.req.param('slug'), ctx.now())
  if (snap.tournament.status === 'draft') {
    // un brouillon n'est visible que de ses organisateurs
    const u = c.get('user')
    const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, snap.tournament.id))
    const st = u ? await ctx.db.select().from(staff).where(and(eq(staff.tournamentId, t!.id), eq(staff.userId, u.id))) : []
    if (!u || (t!.ownerId !== u.id && st.length === 0)) throw new HttpError(404, 'Tournoi introuvable.')
  }
  return c.json(snap)
})

publicRoutes.post('/tournaments/:slug/registrations', async (c) => {
  const ctx = c.get('ctx')
  const b = parse(person.extend({
    email: z.string().trim().email('Adresse mail invalide'),
    phone: z.string().trim().max(30).nullish(),
    note: z.string().trim().max(500).nullish(),
    categories: z.array(z.object({ categoryId: z.string(), partner: person.nullish() })).min(1, 'Choisissez au moins un tableau.')
  }), await c.req.json())
  const r = await submitRegistration(ctx, c.req.param('slug'), b, c.get('user')?.id ?? null)
  return c.json({ ok: true, ...r })
})

publicRoutes.post('/registrations/confirm', async (c) => {
  const b = parse(z.object({ token: z.string().min(10) }), await c.req.json())
  return c.json(await confirmRegistration(c.get('ctx'), b.token))
})

publicRoutes.get('/me/registrations', async (c) => {
  const ctx = c.get('ctx')
  const u = requireUser(c)
  const mine = await ctx.db.select().from(players).where(or(eq(players.userId, u.id), eq(players.email, u.email)))
  if (mine.length === 0) return c.json([])
  const ids = mine.map(p => p.id)
  const rows = await ctx.db.select({ r: registrations, cat: categories.name, t: tournaments.name, slug: tournaments.slug, date: tournaments.startDate })
    .from(registrations).innerJoin(categories, eq(categories.id, registrations.categoryId)).innerJoin(tournaments, eq(tournaments.id, registrations.tournamentId))
    .where(or(inArray(registrations.player1Id, ids), inArray(registrations.player2Id, ids))).orderBy(desc(tournaments.startDate))
  return c.json(rows.map(x => ({ id: x.r.id, status: x.r.status, category: x.cat, tournament: x.t, slug: x.slug, date: x.date, organizerNote: x.r.organizerNote })))
})

publicRoutes.get('/players', async (c) => {
  const ctx = c.get('ctx')
  const q = (c.req.query('q') ?? '').trim()
  if (q.length < 2) return c.json([])
  const like = `%${q.replace(/[%_]/g, '')}%`
  const rows = await ctx.db.select().from(players).where(or(ilike(players.lastName, like), ilike(players.firstName, like), ilike(sql`${players.firstName} || ' ' || ${players.lastName}`, like))).limit(30)
  return c.json(rows.map(p => ({ id: p.id, name: playerName(p), club: p.club })))
})

publicRoutes.get('/players/:id', async c => c.json(await playerHistory(c.get('ctx').db, c.req.param('id'))))

// --- suivi de joueurs et notifications, par appareil (aucun compte nécessaire) ---

function device(c: { get: (k: 'deviceId') => string | null }): string {
  const d = c.get('deviceId')
  if (!d || d.length < 8) throw bad('Appareil non identifié.')
  return d
}

publicRoutes.get('/follows', async (c) => {
  const ctx = c.get('ctx')
  const d = c.get('deviceId')
  if (!d) return c.json([])
  const rows = await ctx.db.select({ f: follows, p: players }).from(follows).innerJoin(players, eq(players.id, follows.playerId)).where(eq(follows.deviceId, d))
  return c.json(rows.map(x => ({ playerId: x.p.id, name: playerName(x.p), club: x.p.club, isMe: x.f.isMe })))
})

publicRoutes.post('/follows', async (c) => {
  const ctx = c.get('ctx')
  const b = parse(z.object({ playerId: z.string(), isMe: z.boolean().default(false) }), await c.req.json())
  const [p] = await ctx.db.select().from(players).where(eq(players.id, b.playerId))
  if (!p) throw new HttpError(404, 'Joueur introuvable.')
  await ctx.db.insert(follows).values({ deviceId: device(c), playerId: b.playerId, isMe: b.isMe })
    .onConflictDoUpdate({ target: [follows.deviceId, follows.playerId], set: { isMe: b.isMe } })
  return c.json({ ok: true })
})

publicRoutes.delete('/follows/:playerId', async (c) => {
  await c.get('ctx').db.delete(follows).where(and(eq(follows.deviceId, device(c)), eq(follows.playerId, c.req.param('playerId'))))
  return c.json({ ok: true })
})

publicRoutes.get('/push/key', async c => c.json({ publicKey: (await vapidKeys(c.get('ctx'))).publicKey }))

publicRoutes.post('/push/subscribe', async (c) => {
  const b = parse(z.object({ kind: z.enum(['web', 'expo']), payload: z.record(z.string(), z.unknown()) }), await c.req.json())
  await c.get('ctx').db.insert(pushSubscriptions).values({ deviceId: device(c), kind: b.kind, payload: b.payload })
    .onConflictDoUpdate({ target: pushSubscriptions.deviceId, set: { kind: b.kind, payload: b.payload } })
  return c.json({ ok: true })
})

publicRoutes.delete('/push/subscribe', async (c) => {
  await c.get('ctx').db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, device(c)))
  return c.json({ ok: true })
})

publicRoutes.get('/notifications', async (c) => {
  const d = c.get('deviceId')
  if (!d) return c.json([])
  return c.json(await c.get('ctx').db.select().from(notifications).where(eq(notifications.deviceId, d)).orderBy(desc(notifications.createdAt)).limit(40))
})

// Boîte d'envoi lisible hors production : sert au développement et aux tests de bout en bout.
publicRoutes.get('/dev/outbox', async (c) => {
  if (process.env.NODE_ENV === 'production' && process.env.PLUME_DEV_MAIL !== '1') throw new HttpError(404, 'Introuvable.')
  return c.json(await c.get('ctx').db.select().from(outbox).orderBy(desc(outbox.createdAt)).limit(50))
})
