/**
 * Données de démonstration : un tournoi en cours, un tournoi à venir ouvert aux inscriptions,
 * un tournoi passé (pour l'historique des joueurs).
 * Usage : npm run seed   (remet à zéro les données de démonstration)
 */
import { eq } from 'drizzle-orm'
import { rng, setsToWin, setTarget, type ScoringRules, type SetScore } from '@plume/engine'
import { hashPassword } from './auth'
import type { Ctx } from './context'
import { openDb, schema } from './db'
import { drawCategory } from './services/draw'
import { withdrawEntry } from './services/incidents'
import { log } from './services/journal'
import { callMatch, liveScore, recordResult, startMatch } from './services/matches'
import { findOrCreatePlayer } from './services/registrations'
import { buildSnapshot } from './services/snapshot'

const { categories, courts, registrations, tournaments, users } = schema
export const DEMO = { email: 'orga@plume.test', password: 'plume-demo' }

const rand = rng(2026)
const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)]!
const H = ['Lucas', 'Hugo', 'Nathan', 'Léo', 'Jules', 'Adam', 'Louis', 'Gabriel', 'Arthur', 'Raphaël', 'Paul', 'Tom', 'Noah', 'Ethan', 'Maxime', 'Antoine', 'Clément', 'Julien', 'Thomas', 'Nicolas', 'Romain', 'Quentin', 'Bastien', 'Florian', 'Mathis', 'Simon', 'Victor', 'Baptiste', 'Damien', 'Kévin', 'Yanis', 'Théo']
const F = ['Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Lina', 'Léa', 'Manon', 'Camille', 'Sarah', 'Julie', 'Marie', 'Clara', 'Inès', 'Zoé', 'Laura', 'Pauline', 'Élise', 'Margaux', 'Océane', 'Anaïs', 'Lucie', 'Mathilde', 'Charlotte']
const N = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guérin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Morin', 'Mathieu', 'Clément', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin', 'Masson', 'Sanchez', 'Gérard', 'Nguyen', 'Boyer', 'Denis', 'Lemaire']
const CLUBS = ['BSL Plume', 'Volant Savoyard', 'ASPTT Badminton', 'BC des Lacs', 'Les Fous du Volant', 'Smash Club 73']

function randomSets(rules: ScoringRules, winner: 1 | 2): SetScore[] {
  const need = setsToWin(rules)
  const loserSets = rules.bestOf === 1 ? 0 : rand() < 0.35 ? 1 : 0
  const order: (1 | 2)[] = Array.from({ length: need + loserSets }, (_, i) => (i === 0 && loserSets ? (winner === 1 ? 2 : 1) : winner))
  if (loserSets && rand() < 0.5 && order.length > 2) [order[0], order[1]] = [order[1]!, order[0]!]
  return order.map((w, i) => {
    const { target, cap } = setTarget(rules, i)
    let hi = target
    let lo = Math.floor(target * (0.35 + rand() * 0.55))
    if (rules.winByTwo && rand() < 0.15) { lo = target - 1 + Math.floor(rand() * 3); hi = Math.min(lo + 2, cap ?? lo + 2); if (cap && hi === cap && lo < cap - 2) lo = cap - 1 }
    if (!rules.winByTwo) lo = Math.min(lo, target - 1)
    else if (hi === target) lo = Math.min(lo, target - 2)
    return w === 1 ? { a: hi, b: lo } : { a: lo, b: hi }
  })
}

async function main() {
  const { db, close } = await openDb()
  let clock = Date.now()
  const ctx: Ctx = {
    db, appUrl: 'http://localhost:8081', now: () => new Date(clock),
    mailer: { send: async () => {} }, realtime: { tournamentChanged: () => {}, toDevice: () => {} }
  }
  // remise à zéro des données de démonstration
  const [old] = await db.select().from(users).where(eq(users.email, DEMO.email))
  if (old) {
    await db.delete(tournaments).where(eq(tournaments.ownerId, old.id))
    await db.delete(users).where(eq(users.id, old.id))
  }
  const [orga] = await db.insert(users).values({ email: DEMO.email, name: 'Camille (organisation)', passwordHash: await hashPassword(DEMO.password) }).returning()

  const used = new Set<string>()
  const person = (g: 'M' | 'F') => {
    for (;;) {
      const firstName = pick(g === 'M' ? H : F)
      const lastName = pick(N)
      if (used.has(`${firstName} ${lastName}`)) continue
      used.add(`${firstName} ${lastName}`)
      return { firstName, lastName, gender: g, club: pick(CLUBS), licence: String(6_000_000 + Math.floor(rand() * 900_000)) }
    }
  }
  const men = Array.from({ length: 28 }, () => person('M'))
  const women = Array.from({ length: 20 }, () => person('F'))
  const R21: ScoringRules = { bestOf: 3, pointsPerSet: 21, winByTwo: true, cap: 30 }
  const R15: ScoringRules = { bestOf: 3, pointsPerSet: 15, winByTwo: true, cap: 21 }

  async function tournament(name: string, startDate: string, status: schema.TournamentStatus, nCourts: number, extra: Partial<typeof tournaments.$inferInsert> = {}) {
    const slug = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const [t] = await db.insert(tournaments).values({
      slug, name, clubName: 'BSL Plume', location: 'Gymnase des Marronniers, Chambéry', startDate, status, ownerId: orga!.id,
      description: 'Tournoi convivial ouvert à tous les licenciés. Buvette et restauration sur place toute la journée.',
      rulesText: 'Poules de 4 puis tableau final. Deux qualifiés par poule.\nVolants plumes à la charge des joueurs, en partage.\nTenue de sport correcte exigée. Tout joueur absent 5 minutes après le troisième appel est déclaré forfait.\nLe juge-arbitre peut modifier le format des matchs en cas de retard.',
      settings: { restMinutes: 10, federation: 'FFBaD', contactEmail: DEMO.email, paymentInfo: '14 € un tableau, 20 € deux tableaux. Règlement sur place ou par virement au club.' },
      ...extra
    }).returning()
    await db.insert(courts).values(Array.from({ length: nCourts }, (_, i) => ({ tournamentId: t!.id, name: `Terrain ${i + 1}`, position: i })))
    return t!
  }
  async function category(tid: string, position: number, name: string, discipline: schema.Discipline, maxEntries: number, format: schema.CategoryFormat, poolRules = R21, bracketRules = R21, level = '') {
    const [c] = await db.insert(categories).values({ tournamentId: tid, position, name, discipline, maxEntries, format, poolRules, bracketRules, level }).returning()
    return c!
  }
  async function enter(tid: string, cid: string, list: (typeof men[number])[][], status: schema.RegistrationStatus = 'accepted', seeds = 0) {
    for (const [i, team] of list.entries()) {
      const p1 = await findOrCreatePlayer(ctx, team[0]!)
      const p2 = team[1] ? await findOrCreatePlayer(ctx, team[1]) : null
      await db.insert(registrations).values({
        tournamentId: tid, categoryId: cid, player1Id: p1.id, player2Id: p2?.id ?? null, status, source: i % 3 === 0 ? 'manual' : 'online',
        email: `${team[0]!.firstName}.${team[0]!.lastName}@exemple.fr`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
        phone: `06 ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))}`,
        seed: i < seeds ? i + 1 : null, createdAt: new Date(clock - (list.length - i) * 3600_000)
      })
    }
  }
  const pairs = (a: typeof men, b: typeof men, n: number) => Array.from({ length: n }, (_, i) => [a[i]!, b[i]!])
  /** Joue des matchs jusqu'à ce que `stop` dise d'arrêter. */
  async function play(t: typeof tournaments.$inferSelect, stop: (done: number, total: number) => boolean) {
    for (let guard = 0; guard < 2000; guard++) {
      const s = await buildSnapshot(db, t.id, ctx.now())
      const total = s.matches.length
      const done = s.matches.filter(m => m.status === 'completed' || m.status === 'cancelled').length
      if (stop(done, total)) return
      const live = s.matches.filter(m => m.status === 'called' || m.status === 'playing')
      const free = s.courts.filter(c => c.open && !c.matchId)
      const ready = s.matches.filter(m => m.status === 'pending' && m.entry1Id && m.entry2Id).sort((a, b) => (a.estimatedStart ?? 0) - (b.estimatedStart ?? 0))
      let launched = false
      for (const c of free) {
        for (const m of ready) {
          try { await callMatch(ctx, m.id, c.id); await startMatch(ctx, m.id); ready.splice(ready.indexOf(m), 1); launched = true; break } catch { /* joueur déjà en jeu */ }
        }
      }
      if (launched) { clock += 2 * 60_000; continue }
      if (live.length === 0) return
      const m = live[0]!
      const cat = s.categories.find(c => c.id === m.categoryId)!
      clock += Math.round((6 + rand() * 6) * 60_000)
      await recordResult(ctx, m.id, { sets: randomSets(m.phase === 'pool' ? cat.poolRules : cat.bracketRules, rand() < 0.6 ? 1 : 2), resultType: 'normal' })
    }
  }

  const iso = (d: number) => new Date(d).toISOString().slice(0, 10)
  const today = Date.now()

  // 1. tournoi passé, entièrement joué
  clock = today - 60 * 86_400_000
  const past = await tournament('Tournoi d\'Automne', iso(clock), 'published', 5)
  const pSH = await category(past.id, 0, 'Simple Hommes', 'SH', 16, { type: 'pools_bracket', poolSize: 4, qualifiers: 2, thirdPlace: true })
  const pDX = await category(past.id, 1, 'Double Mixte', 'DX', 8, { type: 'bracket', poolSize: 4, qualifiers: 2, thirdPlace: false })
  await enter(past.id, pSH.id, men.slice(0, 16).map(m => [m]), 'accepted', 4)
  await enter(past.id, pDX.id, pairs(men.slice(4, 12), women, 8))
  await drawCategory(db, pSH.id, { seed: 11 })
  await drawCategory(db, pDX.id, { seed: 11 })
  await db.update(tournaments).set({ status: 'running' }).where(eq(tournaments.id, past.id))
  await play(past, (d, n) => d >= n)
  await db.update(tournaments).set({ status: 'finished', registrationOpen: false }).where(eq(tournaments.id, past.id))

  // 2. tournoi du jour, en cours
  clock = today - 3 * 3600_000
  const live = await tournament('Tournoi de la Plume', iso(today), 'published', 6, { settings: { restMinutes: 10, federation: 'FFBaD', contactEmail: DEMO.email, startTime: new Date(clock).toISOString(), paymentInfo: '14 € un tableau, 20 € deux tableaux. Règlement sur place.' } })
  const fmt: schema.CategoryFormat = { type: 'pools_bracket', poolSize: 4, qualifiers: 2, thirdPlace: false }
  const lSH = await category(live.id, 0, 'Simple Hommes', 'SH', 16, fmt, R21, R21, 'Séries R et D')
  const lSD = await category(live.id, 1, 'Simple Dames', 'SD', 8, fmt, R21, R21, 'Toutes séries')
  const lDH = await category(live.id, 2, 'Double Hommes', 'DH', 8, fmt, R15, R21, 'Séries D et P')
  const lDX = await category(live.id, 3, 'Double Mixte', 'DX', 8, { type: 'bracket', poolSize: 4, qualifiers: 2, thirdPlace: true }, R21, R21, 'Toutes séries')
  await enter(live.id, lSH.id, men.slice(0, 16).map(m => [m]), 'accepted', 4)
  await enter(live.id, lSD.id, women.slice(0, 8).map(m => [m]), 'accepted', 2)
  await enter(live.id, lDH.id, pairs(men.slice(12, 20), men.slice(20, 28), 8), 'accepted', 2)
  await enter(live.id, lDX.id, pairs(men.slice(0, 8), women.slice(8, 16), 8))
  for (const c of [lSH, lSD, lDH, lDX]) await drawCategory(db, c.id, { seed: 5 })
  await db.update(tournaments).set({ status: 'running', registrationOpen: false }).where(eq(tournaments.id, live.id))
  await log(db, live.id, orga!.id, 'tournament', 'Début du tournoi.')
  await play(live, (d, n) => d >= Math.floor(n * 0.45))
  // un forfait sur blessure, pour montrer la gestion des imprévus
  const s = await buildSnapshot(db, live.id, ctx.now())
  const victim = s.categories.find(c => c.id === lSD.id)!.pools[1]?.standings.at(-1)
  if (victim) {
    await withdrawEntry(ctx, victim.id, 'walkover')
    await log(db, live.id, orga!.id, 'incident', `Retrait de ${s.categories.find(c => c.id === lSD.id)!.entries.find(e => e.id === victim.id)?.name} (Simple Dames), blessure à la cheville : matchs restants perdus par forfait.`)
  }
  // on recale sur maintenant : quelques matchs en cours avec un score partiel, un match tout juste appelé
  clock = today
  const now = await buildSnapshot(db, live.id, ctx.now())
  const onCourt = now.matches.filter(m => m.status === 'playing' || m.status === 'called')
  const partial: SetScore[][] = [[{ a: 21, b: 17 }, { a: 9, b: 11 }], [{ a: 14, b: 12 }], [{ a: 18, b: 21 }, { a: 21, b: 19 }, { a: 6, b: 4 }], [{ a: 3, b: 5 }]]
  for (const [i, m] of onCourt.entries()) {
    const cat = now.categories.find(x => x.id === m.categoryId)!
    const rules = m.phase === 'pool' ? cat.poolRules : cat.bracketRules
    if (i === onCourt.length - 1 && onCourt.length > 1) {
      await db.update(schema.matches).set({ status: 'called', startedAt: null, calledAt: new Date(today - 60_000), sets: [] }).where(eq(schema.matches.id, m.id))
      continue
    }
    await db.update(schema.matches).set({ calledAt: new Date(today - (22 - i * 4) * 60_000), startedAt: new Date(today - (19 - i * 4) * 60_000) }).where(eq(schema.matches.id, m.id))
    await liveScore(ctx, m.id, rules.pointsPerSet === 21 && rules.bestOf === 3 ? partial[i % partial.length]! : [{ a: 7, b: 9 }])
  }

  // 3. tournoi à venir, inscriptions ouvertes
  clock = today
  const next = await tournament('Open de Printemps', iso(today + 45 * 86_400_000), 'published', 7, { settings: { restMinutes: 10, federation: 'FFBaD', contactEmail: DEMO.email, registrationDeadline: iso(today + 35 * 86_400_000), paymentInfo: '15 € un tableau, 21 € deux tableaux. Règlement par virement avant la date limite.' } })
  const nSH = await category(next.id, 0, 'Simple Hommes A', 'SH', 16, fmt, R21, R21, 'N3 à R5')
  const nSHB = await category(next.id, 1, 'Simple Hommes B', 'SH', 16, fmt, R21, R21, 'R6 à P12')
  const nSD = await category(next.id, 2, 'Simple Dames', 'SD', 12, fmt, R21, R21, 'Toutes séries')
  await category(next.id, 3, 'Double Hommes', 'DH', 12, fmt, R21, R21, 'Toutes séries')
  await category(next.id, 4, 'Double Dames', 'DD', 8, fmt, R21, R21, 'Toutes séries')
  const nDX = await category(next.id, 5, 'Double Mixte', 'DX', 16, fmt, R21, R21, 'Toutes séries')
  await enter(next.id, nSH.id, men.slice(0, 9).map(m => [m]), 'accepted')
  await enter(next.id, nSH.id, men.slice(9, 13).map(m => [m]), 'pending')
  await enter(next.id, nSHB.id, men.slice(13, 20).map(m => [m]), 'accepted')
  await enter(next.id, nSHB.id, men.slice(20, 23).map(m => [m]), 'pending')
  await enter(next.id, nSD.id, women.slice(0, 6).map(m => [m]), 'accepted')
  await enter(next.id, nSD.id, women.slice(6, 8).map(m => [m]), 'pending')
  await enter(next.id, nDX.id, pairs(men.slice(0, 5), women.slice(10, 15), 5), 'accepted')
  await enter(next.id, nDX.id, pairs(men.slice(5, 7), women.slice(15, 17), 2), 'pending')

  const final = await buildSnapshot(db, live.id)
  console.log(`Données de démonstration prêtes.
  Tournoi en cours : /t/${live.slug}  (${final.matches.filter(m => m.status === 'completed').length} matchs joués sur ${final.matches.length}, ${final.matches.filter(m => m.status === 'playing' || m.status === 'called').length} sur les terrains)
  Tournoi à venir  : /t/${next.slug}
  Tournoi passé    : /t/${past.slug}
  Compte organisateur de démonstration : ${DEMO.email} / ${DEMO.password}`)
  await close()
}

main().catch((e) => { console.error(e); process.exit(1) })
