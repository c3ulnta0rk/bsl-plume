import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { DEFAULT_RULES, describeRules, suggestNext, type SchedMatch } from '@plume/engine'
import { requireStaff, requireUser, type Env } from '../auth'
import { bad, conflict, notFound, type Ctx } from '../context'
import { schema } from '../db'
import { drawCategory, resetDraw, settleCategory } from '../services/draw'
import { reinstateEntry, withdrawEntry } from '../services/incidents'
import { log } from '../services/journal'
import { callMatch, liveScore, recordResult, resetMatch, startMatch, uncallMatch } from '../services/matches'
import { playerName, slugify } from '../services/names'
import { changed } from '../services/notify'
import { decideRegistration, findOrCreatePlayer, isDoubles } from '../services/registrations'
import { buildSnapshot } from '../services/snapshot'
import { parse, person } from './public'

const { categories, courts, journal, matches, players, poolEntries, pools, registrations, staff, tournaments, users } = schema

const rules = z.object({
  bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  pointsPerSet: z.number().int().min(5).max(50),
  winByTwo: z.boolean(),
  cap: z.number().int().min(5).max(99).nullable(),
  decidingSetPoints: z.number().int().min(5).max(50).nullish(),
  decidingSetCap: z.number().int().min(5).max(99).nullish()
}).refine(r => r.cap === null || r.cap > r.pointsPerSet, 'Le plafond doit être supérieur au nombre de points du set.')

const format = z.object({
  type: z.enum(['pools_bracket', 'pools', 'bracket']),
  poolSize: z.number().int().min(3).max(8),
  qualifiers: z.number().int().min(1).max(4),
  thirdPlace: z.boolean()
})

const set = z.object({ a: z.number().int().min(0).max(99), b: z.number().int().min(0).max(99) })

export const organizerRoutes = new Hono<Env>()

async function matchTournament(ctx: Ctx, matchId: string) {
  const [m] = await ctx.db.select().from(matches).where(eq(matches.id, matchId))
  if (!m) throw notFound('Match introuvable.')
  return m
}
async function categoryOf(ctx: Ctx, id: string) {
  const [cat] = await ctx.db.select().from(categories).where(eq(categories.id, id))
  if (!cat) throw notFound('Tableau introuvable.')
  return cat
}
async function entryName(ctx: Ctx, regId: string | null): Promise<string> {
  if (!regId) return '?'
  const [r] = await ctx.db.select().from(registrations).where(eq(registrations.id, regId))
  if (!r) return '?'
  const ps = await ctx.db.select().from(players).where(inArray(players.id, [r.player1Id, r.player2Id].filter((x): x is string => !!x)))
  return [r.player1Id, r.player2Id].filter(Boolean).map(id => ps.find(p => p.id === id)).filter(Boolean).map(p => playerName(p!)).join(' / ')
}

// ---------- tournois ----------

organizerRoutes.get('/tournaments', async (c) => {
  const ctx = c.get('ctx')
  const u = requireUser(c)
  const st = await ctx.db.select().from(staff).where(eq(staff.userId, u.id))
  const ts = await ctx.db.select().from(tournaments).where(or(eq(tournaments.ownerId, u.id), st.length ? inArray(tournaments.id, st.map(s => s.tournamentId)) : undefined)).orderBy(desc(tournaments.startDate))
  return c.json(ts.map(t => ({ id: t.id, slug: t.slug, name: t.name, status: t.status, startDate: t.startDate, location: t.location, role: t.ownerId === u.id ? 'owner' : st.find(s => s.tournamentId === t.id)?.role })))
})

organizerRoutes.post('/tournaments', async (c) => {
  const ctx = c.get('ctx')
  const u = requireUser(c)
  const b = parse(z.object({
    name: z.string().trim().min(3, 'Nom du tournoi requis').max(100),
    clubName: z.string().trim().max(100).default(''),
    location: z.string().trim().max(120).default(''),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    courts: z.number().int().min(1).max(40).default(4)
  }), await c.req.json())
  let slug = slugify(b.name)
  for (let i = 2; (await ctx.db.select().from(tournaments).where(eq(tournaments.slug, slug))).length > 0; i++) slug = `${slugify(b.name)}-${i}`
  const [t] = await ctx.db.insert(tournaments).values({
    slug, name: b.name, clubName: b.clubName, location: b.location, startDate: b.startDate, endDate: b.endDate ?? null,
    ownerId: u.id, settings: { restMinutes: 10, federation: 'FFBaD', contactEmail: u.email }
  }).returning()
  await ctx.db.insert(courts).values(Array.from({ length: b.courts }, (_, i) => ({ tournamentId: t!.id, name: `Terrain ${i + 1}`, position: i })))
  await log(ctx.db, t!.id, u.id, 'tournament', `Tournoi créé avec ${b.courts} terrains.`)
  return c.json({ id: t!.id, slug: t!.slug })
})

organizerRoutes.patch('/tournaments/:id', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const b = parse(z.object({
    name: z.string().trim().min(3).max(100).optional(),
    clubName: z.string().trim().max(100).optional(),
    location: z.string().trim().max(120).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    description: z.string().max(5000).optional(),
    rulesText: z.string().max(20000).optional(),
    status: z.enum(['draft', 'published', 'running', 'finished']).optional(),
    registrationOpen: z.boolean().optional(),
    settings: z.object({
      restMinutes: z.number().int().min(0).max(120).optional(),
      paymentInfo: z.string().max(1000).optional(),
      contactEmail: z.string().max(200).optional(),
      registrationDeadline: z.string().nullish(),
      startTime: z.string().nullish(),
      pausedUntil: z.string().nullish(),
      federation: z.enum(['FFBaD', 'BWF', 'Libre']).optional()
    }).optional()
  }), await c.req.json())
  const { settings, ...rest } = b
  await ctx.db.update(tournaments).set({ ...rest, settings: { ...t.settings, ...(settings ?? {}) } }).where(eq(tournaments.id, t.id))
  const u = requireUser(c)
  if (b.status && b.status !== t.status) await log(ctx.db, t.id, u.id, 'tournament', `Statut : ${({ draft: 'brouillon', published: 'publié', running: 'en cours', finished: 'terminé' })[b.status]}.`)
  if (settings?.restMinutes !== undefined && settings.restMinutes !== t.settings.restMinutes) await log(ctx.db, t.id, u.id, 'incident', `Temps de repos entre deux matchs : ${settings.restMinutes} min.`)
  if (settings?.pausedUntil !== undefined && settings.pausedUntil !== t.settings.pausedUntil) {
    await log(ctx.db, t.id, u.id, 'incident', settings.pausedUntil ? `Pause : reprise des matchs à ${new Date(settings.pausedUntil).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.` : 'Fin de la pause.')
  }
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.delete('/tournaments/:id', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  if (t.ownerId !== requireUser(c).id) throw conflict('Seul le créateur du tournoi peut le supprimer.')
  await ctx.db.delete(tournaments).where(eq(tournaments.id, t.id))
  return c.json({ ok: true })
})

// ---------- terrains ----------

organizerRoutes.post('/tournaments/:id/courts', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const existing = await ctx.db.select().from(courts).where(eq(courts.tournamentId, t.id))
  const n = Math.max(0, ...existing.map(x => x.position)) + (existing.length ? 1 : 0)
  await ctx.db.insert(courts).values({ tournamentId: t.id, name: `Terrain ${existing.length + 1}`, position: n })
  await log(ctx.db, t.id, requireUser(c).id, 'incident', `Terrain ajouté : ${existing.length + 1} terrains au total.`)
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.patch('/courts/:id', async (c) => {
  const ctx = c.get('ctx')
  const [court] = await ctx.db.select().from(courts).where(eq(courts.id, c.req.param('id')))
  if (!court) throw notFound('Terrain introuvable.')
  const t = await requireStaff(c, court.tournamentId)
  const b = parse(z.object({ name: z.string().trim().min(1).max(30).optional(), open: z.boolean().optional() }), await c.req.json())
  if (b.open === false) {
    const busy = await ctx.db.select().from(matches).where(and(eq(matches.courtId, court.id), inArray(matches.status, ['called', 'playing'])))
    if (busy.length > 0) throw conflict('Un match est en cours sur ce terrain : terminez-le ou annulez son appel avant de fermer le terrain.')
  }
  await ctx.db.update(courts).set(b).where(eq(courts.id, court.id))
  if (b.open !== undefined && b.open !== court.open) await log(ctx.db, t.id, requireUser(c).id, 'incident', `${court.name} ${b.open ? 'rouvert' : 'fermé'}.`)
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.delete('/courts/:id', async (c) => {
  const ctx = c.get('ctx')
  const [court] = await ctx.db.select().from(courts).where(eq(courts.id, c.req.param('id')))
  if (!court) throw notFound('Terrain introuvable.')
  const t = await requireStaff(c, court.tournamentId)
  const used = await ctx.db.select().from(matches).where(and(eq(matches.courtId, court.id), inArray(matches.status, ['called', 'playing'])))
  if (used.length > 0) throw conflict('Un match est en cours sur ce terrain.')
  await ctx.db.delete(courts).where(eq(courts.id, court.id))
  await log(ctx.db, t.id, requireUser(c).id, 'incident', `${court.name} supprimé.`)
  changed(ctx, t.id)
  return c.json({ ok: true })
})

// ---------- tableaux (catégories) ----------

const categoryBody = z.object({
  name: z.string().trim().min(1, 'Nom du tableau requis').max(60),
  discipline: z.enum(['SH', 'SD', 'DH', 'DD', 'DX']),
  level: z.string().trim().max(60).default(''),
  maxEntries: z.number().int().min(2).max(256),
  format: format,
  poolRules: rules,
  bracketRules: rules
})

organizerRoutes.post('/tournaments/:id/categories', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const raw = await c.req.json() as Record<string, unknown>
  const b = parse(categoryBody, {
    format: { type: 'pools_bracket', poolSize: 4, qualifiers: 2, thirdPlace: false },
    poolRules: DEFAULT_RULES, bracketRules: DEFAULT_RULES, maxEntries: 16, ...raw
  })
  const n = (await ctx.db.select().from(categories).where(eq(categories.tournamentId, t.id))).length
  const [cat] = await ctx.db.insert(categories).values({ ...b, tournamentId: t.id, position: n }).returning()
  changed(ctx, t.id)
  return c.json({ id: cat!.id })
})

organizerRoutes.patch('/categories/:id', async (c) => {
  const ctx = c.get('ctx')
  const cat = await categoryOf(ctx, c.req.param('id'))
  const t = await requireStaff(c, cat.tournamentId)
  const b = parse(categoryBody.partial(), await c.req.json())
  if (b.discipline && b.discipline !== cat.discipline && isDoubles(b.discipline) !== isDoubles(cat.discipline)) {
    const n = (await ctx.db.select().from(registrations).where(eq(registrations.categoryId, cat.id))).length
    if (n > 0) throw conflict('Des inscriptions existent : impossible de passer de simple à double.')
  }
  if (b.format && cat.status !== 'registration' && JSON.stringify(b.format) !== JSON.stringify(cat.format)) {
    throw conflict('Le tirage est fait : annulez-le pour changer la formule du tableau.')
  }
  await ctx.db.update(categories).set(b).where(eq(categories.id, cat.id))
  const u = requireUser(c)
  // changement de format de score en cours de route : ne touche que les matchs pas encore joués
  for (const [key, label] of [['poolRules', 'poules'], ['bracketRules', 'tableau final']] as const) {
    const next = b[key]
    if (next && JSON.stringify(next) !== JSON.stringify(cat[key]) && cat.status !== 'registration') {
      const left = (await ctx.db.select().from(matches).where(and(eq(matches.categoryId, cat.id), eq(matches.phase, key === 'poolRules' ? 'pool' : 'bracket'), inArray(matches.status, ['pending', 'called', 'playing'])))).length
      await log(ctx.db, t.id, u.id, 'incident', `${cat.name}, ${label} : format de score changé de « ${describeRules(cat[key])} » à « ${describeRules(next)} » (${left} matchs restants concernés).`)
    }
  }
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.delete('/categories/:id', async (c) => {
  const ctx = c.get('ctx')
  const cat = await categoryOf(ctx, c.req.param('id'))
  const t = await requireStaff(c, cat.tournamentId)
  const played = await ctx.db.select().from(matches).where(and(eq(matches.categoryId, cat.id), inArray(matches.status, ['called', 'playing', 'completed'])))
  if (played.some(m => m.resultType !== 'bye')) throw conflict('Des matchs ont été joués dans ce tableau.')
  await ctx.db.delete(categories).where(eq(categories.id, cat.id))
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.post('/categories/:id/draw', async (c) => {
  const ctx = c.get('ctx')
  const cat = await categoryOf(ctx, c.req.param('id'))
  const t = await requireStaff(c, cat.tournamentId)
  const b = parse(z.object({ poolCount: z.number().int().min(1).max(64).optional(), seed: z.number().int().optional() }), await c.req.json().catch(() => ({})))
  await drawCategory(ctx.db, cat.id, b)
  const n = (await ctx.db.select().from(pools).where(eq(pools.categoryId, cat.id))).length
  await log(ctx.db, t.id, requireUser(c).id, 'draw', `Tirage de « ${cat.name} »${n ? ` : ${n} poule${n > 1 ? 's' : ''}` : ' : tableau à élimination directe'}.`)
  changed(ctx, t.id)
  return c.json({ ok: true })
})

organizerRoutes.delete('/categories/:id/draw', async (c) => {
  const ctx = c.get('ctx')
  const cat = await categoryOf(ctx, c.req.param('id'))
  const t = await requireStaff(c, cat.tournamentId)
  await resetDraw(ctx.db, cat.id)
  await log(ctx.db, t.id, requireUser(c).id, 'draw', `Tirage de « ${cat.name} » annulé.`)
  changed(ctx, t.id)
  return c.json({ ok: true })
})

// ---------- inscriptions ----------

organizerRoutes.get('/tournaments/:id/registrations', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const regs = await ctx.db.select().from(registrations).where(eq(registrations.tournamentId, t.id)).orderBy(asc(registrations.createdAt))
  const ids = [...new Set(regs.flatMap(r => [r.player1Id, r.player2Id]).filter((x): x is string => !!x))]
  const ps = ids.length ? await ctx.db.select().from(players).where(inArray(players.id, ids)) : []
  const pub = (id: string | null) => {
    const p = ps.find(x => x.id === id)
    return p ? { id: p.id, name: playerName(p), club: p.club, licence: p.licence, gender: p.gender } : null
  }
  return c.json(regs.map(r => ({
    id: r.id, categoryId: r.categoryId, status: r.status, source: r.source, seed: r.seed, email: r.email, phone: r.phone, note: r.note,
    organizerNote: r.organizerNote, withdrawMode: r.withdrawMode, createdAt: r.createdAt, player1: pub(r.player1Id), player2: pub(r.player2Id)
  })))
})

// Inscription saisie par l'organisateur (téléphone, papier, sur place) : validée d'office.
organizerRoutes.post('/tournaments/:id/registrations', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const b = parse(z.object({ categoryId: z.string(), player: person, partner: person.nullish(), phone: z.string().nullish(), seed: z.number().int().min(1).nullish() }), await c.req.json())
  const [cat] = await ctx.db.select().from(categories).where(and(eq(categories.id, b.categoryId), eq(categories.tournamentId, t.id)))
  if (!cat) throw notFound('Tableau introuvable.')
  if (cat.status !== 'registration') throw conflict('Ce tableau est déjà tiré : annulez le tirage pour ajouter un inscrit.')
  const p1 = await findOrCreatePlayer(ctx, b.player)
  let p2 = null
  if (isDoubles(cat.discipline)) {
    if (!b.partner) throw bad('Indiquez le partenaire pour un tableau de double.')
    p2 = await findOrCreatePlayer(ctx, b.partner)
    if (p2.id === p1.id) throw bad('Les deux joueurs de la paire sont identiques.')
  }
  const existing = await ctx.db.select().from(registrations).where(and(eq(registrations.categoryId, cat.id), inArray(registrations.status, ['pending_email', 'pending', 'accepted', 'waitlist'])))
  const ids = [p1.id, p2?.id].filter(Boolean)
  if (existing.some(r => ids.includes(r.player1Id) || (r.player2Id && ids.includes(r.player2Id)))) throw conflict('Ce joueur est déjà inscrit dans ce tableau.')
  const full = existing.filter(r => r.status === 'accepted').length >= cat.maxEntries
  const [reg] = await ctx.db.insert(registrations).values({
    tournamentId: t.id, categoryId: cat.id, player1Id: p1.id, player2Id: p2?.id ?? null, email: b.player.email?.toLowerCase() ?? null,
    phone: b.phone ?? null, status: full ? 'waitlist' : 'accepted', source: 'manual', seed: b.seed ?? null
  }).returning()
  changed(ctx, t.id)
  return c.json({ id: reg!.id, status: reg!.status })
})

organizerRoutes.patch('/registrations/:id', async (c) => {
  const ctx = c.get('ctx')
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, c.req.param('id')))
  if (!reg) throw notFound('Inscription introuvable.')
  await requireStaff(c, reg.tournamentId)
  const b = parse(z.object({
    status: z.enum(['pending', 'accepted', 'waitlist', 'refused']).optional(),
    categoryId: z.string().optional(), seed: z.number().int().min(1).max(64).nullish(), organizerNote: z.string().max(500).nullish()
  }), await c.req.json())
  const r = await decideRegistration(ctx, reg.id, b)
  if (r.from.id !== r.to.id) await log(ctx.db, reg.tournamentId, requireUser(c).id, 'registration', `${await entryName(ctx, reg.id)} déplacé de « ${r.from.name} » vers « ${r.to.name} ».`)
  changed(ctx, reg.tournamentId)
  return c.json({ ok: true })
})

organizerRoutes.delete('/registrations/:id', async (c) => {
  const ctx = c.get('ctx')
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, c.req.param('id')))
  if (!reg) throw notFound('Inscription introuvable.')
  await requireStaff(c, reg.tournamentId)
  const inPool = await ctx.db.select().from(poolEntries).where(eq(poolEntries.registrationId, reg.id))
  const used = await ctx.db.select().from(matches).where(or(eq(matches.entry1Id, reg.id), eq(matches.entry2Id, reg.id)))
  if (inPool.length > 0 || used.length > 0) throw conflict('Cette inscription fait partie d\'un tirage : utilisez « Retirer du tableau ».')
  await ctx.db.delete(registrations).where(eq(registrations.id, reg.id))
  changed(ctx, reg.tournamentId)
  return c.json({ ok: true })
})

// ---------- imprévus ----------

organizerRoutes.post('/registrations/:id/withdraw', async (c) => {
  const ctx = c.get('ctx')
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, c.req.param('id')))
  if (!reg) throw notFound('Inscription introuvable.')
  await requireStaff(c, reg.tournamentId)
  const b = parse(z.object({ mode: z.enum(['annul', 'walkover']), reason: z.string().max(200).optional() }), await c.req.json())
  const name = await entryName(ctx, reg.id)
  const cat = await categoryOf(ctx, reg.categoryId)
  await withdrawEntry(ctx, reg.id, b.mode)
  await log(ctx.db, reg.tournamentId, requireUser(c).id, 'incident', `Retrait de ${name} (${cat.name})${b.reason ? `, ${b.reason}` : ''} : ${b.mode === 'annul' ? 'résultats de poule annulés' : 'matchs restants perdus par forfait'}.`)
  changed(ctx, reg.tournamentId)
  return c.json({ ok: true })
})

organizerRoutes.post('/registrations/:id/reinstate', async (c) => {
  const ctx = c.get('ctx')
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, c.req.param('id')))
  if (!reg) throw notFound('Inscription introuvable.')
  await requireStaff(c, reg.tournamentId)
  await reinstateEntry(ctx, reg.id)
  await log(ctx.db, reg.tournamentId, requireUser(c).id, 'incident', `Retour de ${await entryName(ctx, reg.id)} dans le tableau.`)
  changed(ctx, reg.tournamentId)
  return c.json({ ok: true })
})

// ---------- matchs ----------

organizerRoutes.post('/matches/:id/call', async (c) => {
  const ctx = c.get('ctx')
  const m = await matchTournament(ctx, c.req.param('id'))
  await requireStaff(c, m.tournamentId, 'scorer')
  const b = parse(z.object({ courtId: z.string() }), await c.req.json())
  await callMatch(ctx, m.id, b.courtId)
  changed(ctx, m.tournamentId)
  return c.json({ ok: true })
})

for (const [path, fn] of [['uncall', uncallMatch], ['start', startMatch], ['reset', resetMatch]] as const) {
  organizerRoutes.post(`/matches/:id/${path}`, async (c) => {
    const ctx = c.get('ctx')
    const m = await matchTournament(ctx, c.req.param('id'))
    await requireStaff(c, m.tournamentId, path === 'reset' ? 'admin' : 'scorer')
    await fn(ctx, m.id)
    if (path === 'reset') await log(ctx.db, m.tournamentId, requireUser(c).id, 'result', `Résultat du match n° ${m.number} effacé.`)
    changed(ctx, m.tournamentId)
    return c.json({ ok: true })
  })
}

organizerRoutes.post('/matches/:id/score', async (c) => {
  const ctx = c.get('ctx')
  const m = await matchTournament(ctx, c.req.param('id'))
  await requireStaff(c, m.tournamentId, 'scorer')
  const b = parse(z.object({ sets: z.array(set).max(5) }), await c.req.json())
  const u = await liveScore(ctx, m.id, b.sets)
  changed(ctx, m.tournamentId)
  return c.json({ status: u.status, winnerSide: u.winnerSide })
})

organizerRoutes.post('/matches/:id/result', async (c) => {
  const ctx = c.get('ctx')
  const m = await matchTournament(ctx, c.req.param('id'))
  await requireStaff(c, m.tournamentId, 'scorer')
  const b = parse(z.object({ sets: z.array(set).max(5).default([]), resultType: z.enum(['normal', 'retired', 'walkover']).default('normal'), winner: z.union([z.literal(1), z.literal(2)]).optional() }), await c.req.json())
  const wasDone = m.status === 'completed'
  await recordResult(ctx, m.id, b)
  if (wasDone) await log(ctx.db, m.tournamentId, requireUser(c).id, 'result', `Résultat du match n° ${m.number} corrigé.`)
  else if (b.resultType !== 'normal') await log(ctx.db, m.tournamentId, requireUser(c).id, 'result', `Match n° ${m.number} : ${b.resultType === 'walkover' ? 'forfait' : 'abandon'}, victoire de ${await entryName(ctx, b.winner === 1 ? m.entry1Id : m.entry2Id)}.`)
  changed(ctx, m.tournamentId)
  return c.json({ ok: true })
})

/** Remplit les terrains libres avec les matchs les plus pertinents à lancer maintenant. */
organizerRoutes.post('/tournaments/:id/auto-call', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'), 'scorer')
  const b = parse(z.object({ max: z.number().int().min(1).max(40).optional() }), await c.req.json().catch(() => ({})))
  const snap = await buildSnapshot(ctx.db, t.id, ctx.now())
  const free = snap.courts.filter(x => x.open && !x.matchId)
  if (free.length === 0) return c.json({ called: 0 })
  const entries = new Map(snap.categories.flatMap(cat => cat.entries.map(e => [e.id, e] as const)))
  const poolRounds = new Map(snap.categories.map(cat => [cat.id, Math.max(0, ...snap.matches.filter(m => m.categoryId === cat.id && m.phase === 'pool').map(m => m.round))]))
  const sched: SchedMatch[] = snap.matches.map(m => ({
    id: m.id, status: m.status, number: m.number,
    stage: m.phase === 'pool' ? m.round : (poolRounds.get(m.categoryId) ?? 0) + m.round,
    categoryOrder: snap.categories.find(x => x.id === m.categoryId)?.position ?? 0,
    players1: m.entry1Id ? entries.get(m.entry1Id)?.players.map(p => p.id) ?? null : null,
    players2: m.entry2Id ? entries.get(m.entry2Id)?.players.map(p => p.id) ?? null : null,
    dependsOn: [], minutes: 30, endedAt: m.endedAt
  }))
  const picks = suggestNext(sched, Math.min(free.length, b.max ?? free.length), { now: ctx.now().getTime(), restMinutes: t.settings.restMinutes ?? 10 })
  let called = 0
  for (const [i, m] of picks.entries()) {
    try { await callMatch(ctx, m.id, free[i]!.id); called++ } catch { /* un autre poste a pris ce terrain entre-temps */ }
  }
  changed(ctx, t.id)
  return c.json({ called })
})

// ---------- journal, équipe, export ----------

organizerRoutes.get('/tournaments/:id/journal', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'), 'scorer')
  return c.json(await ctx.db.select().from(journal).where(eq(journal.tournamentId, t.id)).orderBy(desc(journal.createdAt)).limit(200))
})

organizerRoutes.get('/tournaments/:id/staff', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const rows = await ctx.db.select({ s: staff, u: users }).from(staff).innerJoin(users, eq(users.id, staff.userId)).where(eq(staff.tournamentId, t.id))
  return c.json(rows.map(r => ({ userId: r.u.id, name: r.u.name, email: r.u.email, role: r.s.role })))
})

organizerRoutes.post('/tournaments/:id/staff', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const b = parse(z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(['admin', 'scorer']) }), await c.req.json())
  const [u] = await ctx.db.select().from(users).where(eq(users.email, b.email))
  if (!u) throw notFound('Aucun compte avec cette adresse : la personne doit d\'abord créer son compte.')
  await ctx.db.insert(staff).values({ tournamentId: t.id, userId: u.id, role: b.role }).onConflictDoUpdate({ target: [staff.tournamentId, staff.userId], set: { role: b.role } })
  return c.json({ ok: true })
})

organizerRoutes.delete('/tournaments/:id/staff/:userId', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  await ctx.db.delete(staff).where(and(eq(staff.tournamentId, t.id), eq(staff.userId, c.req.param('userId'))))
  return c.json({ ok: true })
})

/** Export complet d'un tournoi : sert à passer du site hébergé au serveur de la salle, et retour. */
organizerRoutes.get('/tournaments/:id/export', async (c) => {
  const ctx = c.get('ctx')
  const t = await requireStaff(c, c.req.param('id'))
  const cats = await ctx.db.select().from(categories).where(eq(categories.tournamentId, t.id))
  const regs = await ctx.db.select().from(registrations).where(eq(registrations.tournamentId, t.id))
  const pIds = [...new Set(regs.flatMap(r => [r.player1Id, r.player2Id]).filter((x): x is string => !!x))]
  const ps = cats.length ? await ctx.db.select().from(pools).where(inArray(pools.categoryId, cats.map(x => x.id))) : []
  return c.json({
    format: 'plume-tournament', version: 1, exportedAt: ctx.now().toISOString(),
    tournament: t,
    courts: await ctx.db.select().from(courts).where(eq(courts.tournamentId, t.id)),
    categories: cats,
    players: pIds.length ? (await ctx.db.select().from(players).where(inArray(players.id, pIds))).map(p => ({ ...p, userId: null })) : [],
    registrations: regs,
    pools: ps,
    poolEntries: ps.length ? await ctx.db.select().from(poolEntries).where(inArray(poolEntries.poolId, ps.map(p => p.id))) : [],
    matches: await ctx.db.select().from(matches).where(eq(matches.tournamentId, t.id)),
    journal: await ctx.db.select().from(journal).where(eq(journal.tournamentId, t.id))
  })
})

const dates = <T extends Record<string, unknown>>(row: T, keys: string[]): T => {
  const o: Record<string, unknown> = { ...row }
  for (const k of keys) if (typeof o[k] === 'string') o[k] = new Date(o[k] as string)
  return o as T
}

organizerRoutes.post('/import', async (c) => {
  const ctx = c.get('ctx')
  const u = requireUser(c)
  const d = await c.req.json() as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  if (d?.format !== 'plume-tournament' || !d.tournament?.id) throw bad('Ce fichier n\'est pas un export de tournoi.')
  const [existing] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, d.tournament.id))
  if (existing) {
    await requireStaff(c, existing.id)
    await ctx.db.delete(tournaments).where(eq(tournaments.id, existing.id))
  }
  let slug: string = d.tournament.slug
  for (let i = 2; (await ctx.db.select().from(tournaments).where(eq(tournaments.slug, slug))).length > 0; i++) slug = `${d.tournament.slug}-${i}`
  await ctx.db.transaction(async (tx) => {
    await tx.insert(tournaments).values({ ...dates(d.tournament, ['createdAt']), slug, ownerId: existing?.ownerId ?? u.id })
    const many = async (table: any, rows: any[], keys: string[] = []) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200).map(r => dates(r, keys))).onConflictDoNothing()
    }
    await many(courts, d.courts ?? [])
    await many(categories, d.categories ?? [])
    await many(players, (d.players ?? []).map((p: Record<string, unknown>) => ({ ...p, userId: null })), ['createdAt'])
    await many(registrations, d.registrations ?? [], ['createdAt'])
    await many(pools, d.pools ?? [])
    await many(poolEntries, d.poolEntries ?? [])
    await many(matches, d.matches ?? [], ['calledAt', 'startedAt', 'endedAt'])
    await many(journal, (d.journal ?? []).map((j: Record<string, unknown>) => ({ ...j, userId: null })), ['createdAt'])
  })
  for (const cat of d.categories ?? []) await settleCategory(ctx.db, cat.id)
  await log(ctx.db, d.tournament.id, u.id, 'tournament', 'Tournoi importé depuis un export.')
  return c.json({ id: d.tournament.id, slug })
})
