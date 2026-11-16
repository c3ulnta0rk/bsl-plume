import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Snapshot } from '../src/services/snapshot'
import { notifyTick } from '../src/services/notify'
import { setup } from './helpers'

let h: Awaited<ReturnType<typeof setup>>
let org: ReturnType<typeof h.api>
let anon: ReturnType<typeof h.api>
let tid = ''
let slug = ''
const cat: Record<string, string> = {}

const snap = async () => (await anon<Snapshot>('GET', `/tournaments/${slug}`)).data
const names = (s: Snapshot) => new Map(s.categories.flatMap(c => c.entries.map(e => [e.id, e.name] as const)))

beforeAll(async () => {
  h = await setup()
  anon = h.api(undefined, 'device-spectateur-1')
  const r = await anon('POST', '/auth/register', { email: 'orga@club.fr', name: 'Orga', password: 'motdepasse1' })
  org = h.api(r.data.token)
})
afterAll(() => h.close())

describe('comptes', () => {
  it('refuse un doublon et un mauvais mot de passe', async () => {
    expect((await anon('POST', '/auth/register', { email: 'orga@club.fr', name: 'Autre', password: 'motdepasse1' })).status).toBe(409)
    expect((await anon('POST', '/auth/login', { email: 'orga@club.fr', password: 'faux' })).status).toBe(401)
    expect((await anon('POST', '/auth/login', { email: 'orga@club.fr', password: 'motdepasse1' })).status).toBe(200)
    expect((await anon('GET', '/organizer/tournaments')).status).toBe(401)
  })
})

describe('un tournoi de bout en bout', () => {
  it('crée le tournoi, ses terrains et ses tableaux', async () => {
    const t = await org('POST', '/organizer/tournaments', { name: 'Tournoi de Noël', clubName: 'BSL', location: 'Gymnase', startDate: '2026-12-05', courts: 3 })
    expect(t.status).toBe(200)
    tid = t.data.id; slug = t.data.slug
    expect(slug).toBe('tournoi-de-noel')
    expect((await anon('GET', `/tournaments/${slug}`)).status).toBe(404) // brouillon invisible
    const sh = await org('POST', `/organizer/tournaments/${tid}/categories`, { name: 'Simple Hommes', discipline: 'SH', maxEntries: 8, format: { type: 'pools_bracket', poolSize: 4, qualifiers: 2, thirdPlace: true } })
    const dx = await org('POST', `/organizer/tournaments/${tid}/categories`, { name: 'Double Mixte', discipline: 'DX', maxEntries: 4, format: { type: 'bracket', poolSize: 4, qualifiers: 2, thirdPlace: false } })
    const shb = await org('POST', `/organizer/tournaments/${tid}/categories`, { name: 'Simple Hommes B', discipline: 'SH', maxEntries: 8, format: { type: 'pools', poolSize: 4, qualifiers: 1, thirdPlace: false } })
    cat.sh = sh.data.id; cat.dx = dx.data.id; cat.shb = shb.data.id
    expect((await org('PATCH', `/organizer/tournaments/${tid}`, { status: 'published', settings: { paymentInfo: '12 € par tableau, sur place.' } })).status).toBe(200)
    const s = await snap()
    expect(s.courts.length).toBe(3)
    expect(s.categories.map(c => c.name)).toEqual(['Simple Hommes', 'Double Mixte', 'Simple Hommes B'])
    expect(s.categories[0]!.poolRulesText).toContain('2 sets gagnants de 21')
  })

  it('refuse des règles incohérentes', async () => {
    const r = await org('PATCH', `/organizer/categories/${cat.sh}`, { poolRules: { bestOf: 3, pointsPerSet: 21, winByTwo: true, cap: 15 } })
    expect(r.status).toBe(400)
  })

  it('prend une inscription en ligne avec confirmation par mail', async () => {
    const bad = await anon('POST', `/tournaments/${slug}/registrations`, { firstName: 'Léa', lastName: 'Martin', email: 'lea@x.fr', categories: [{ categoryId: cat.dx }] })
    expect(bad.status).toBe(400) // partenaire manquant en double
    const ok = await anon('POST', `/tournaments/${slug}/registrations`, {
      firstName: 'paul', lastName: 'durand', email: 'Paul@X.fr', club: 'BSL', licence: '0001',
      categories: [{ categoryId: cat.sh }, { categoryId: cat.dx, partner: { firstName: 'Léa', lastName: 'Martin' } }]
    })
    expect(ok.status).toBe(200)
    expect(ok.data.count).toBe(2)
    const dup = await anon('POST', `/tournaments/${slug}/registrations`, { firstName: 'Paul', lastName: 'Durand', email: 'paul@x.fr', licence: '0001', categories: [{ categoryId: cat.sh }] })
    expect(dup.status).toBe(409)
    const mails = (await anon('GET', '/dev/outbox')).data as { to: string, subject: string, body: string }[]
    expect(mails[0]!.to).toBe('paul@x.fr')
    const token = /token=([\w-]+)/.exec(mails[0]!.body)![1]!
    let regs = (await org('GET', `/organizer/tournaments/${tid}/registrations`)).data as { id: string, status: string, categoryId: string, player1: { name: string } }[]
    expect(regs.every(r => r.status === 'pending_email')).toBe(true)
    expect(regs[0]!.player1.name).toBe('Paul DURAND')
    expect((await anon('POST', '/registrations/confirm', { token: 'x'.repeat(20) })).status).toBe(404)
    const conf = await anon('POST', '/registrations/confirm', { token })
    expect(conf.data.slug).toBe(slug)
    regs = (await org('GET', `/organizer/tournaments/${tid}/registrations`)).data
    expect(regs.every(r => r.status === 'pending')).toBe(true)
    // l'organisateur déplace Paul en série B puis le remet, refuse puis valide
    const sh = regs.find(r => r.categoryId === cat.sh)!
    expect((await org('PATCH', `/organizer/registrations/${sh.id}`, { categoryId: cat.dx })).status).toBe(400)
    expect((await org('PATCH', `/organizer/registrations/${sh.id}`, { categoryId: cat.shb, organizerNote: 'Niveau plus adapté.' })).status).toBe(200)
    expect((await org('PATCH', `/organizer/registrations/${sh.id}`, { categoryId: cat.sh, status: 'accepted', seed: 1 })).status).toBe(200)
    for (const r of regs.filter(x => x.id !== sh.id)) await org('PATCH', `/organizer/registrations/${r.id}`, { status: 'accepted' })
    const after = (await anon('GET', '/dev/outbox')).data as { subject: string, body: string }[]
    expect(after.some(m => m.subject.startsWith('Changement de tableau'))).toBe(true)
    expect(after.some(m => m.subject.startsWith('Inscription validée') && m.body.includes('12 €'))).toBe(true)
    // un inconnu ne voit pas les coordonnées
    expect((await anon('GET', `/organizer/tournaments/${tid}/registrations`)).status).toBe(401)
    expect(JSON.stringify(await snap())).not.toContain('paul@x.fr')
  })

  it('complète les tableaux à la main et respecte le nombre de places', async () => {
    for (let i = 2; i <= 8; i++) {
      const r = await org('POST', `/organizer/tournaments/${tid}/registrations`, { categoryId: cat.sh, player: { firstName: `Joueur${i}`, lastName: `Sh${i}`, club: i % 2 ? 'BSL' : 'ASPTT' }, seed: i === 2 ? 2 : null })
      expect(r.data.status).toBe('accepted')
    }
    const extra = await org('POST', `/organizer/tournaments/${tid}/registrations`, { categoryId: cat.sh, player: { firstName: 'Trop', lastName: 'Tard' } })
    expect(extra.data.status).toBe('waitlist')
    expect((await org('PATCH', `/organizer/registrations/${extra.data.id}`, { status: 'accepted' })).status).toBe(409)
    for (let i = 2; i <= 3; i++) {
      await org('POST', `/organizer/tournaments/${tid}/registrations`, { categoryId: cat.dx, player: { firstName: `H${i}`, lastName: 'Mixte' }, partner: { firstName: `F${i}`, lastName: 'Mixte' } })
    }
    for (let i = 1; i <= 3; i++) await org('POST', `/organizer/tournaments/${tid}/registrations`, { categoryId: cat.shb, player: { firstName: `B${i}`, lastName: 'Serie' } })
    const s = await snap()
    expect(s.categories.map(c => c.counts.accepted)).toEqual([8, 3, 3])
    expect(s.categories[0]!.counts.waitlist).toBe(1)
  })

  it('tire les poules et le tableau', async () => {
    expect((await org('POST', `/organizer/categories/${cat.sh}/draw`, { seed: 7 })).status).toBe(200)
    expect((await org('POST', `/organizer/categories/${cat.dx}/draw`, { seed: 7 })).status).toBe(200)
    expect((await org('POST', `/organizer/categories/${cat.shb}/draw`, { seed: 7 })).status).toBe(200)
    const s = await snap()
    const sh = s.categories[0]!
    expect(sh.pools.length).toBe(2)
    expect(sh.pools.map(p => p.standings.length)).toEqual([4, 4])
    const n = names(s)
    // têtes de série séparées
    expect(n.get(sh.pools[0]!.standings.find(r => n.get(r.id) === 'Paul DURAND')?.id ?? '')).toBe('Paul DURAND')
    expect(sh.pools[1]!.standings.some(r => n.get(r.id) === 'Joueur2 SH2')).toBe(true)
    const shm = s.matches.filter(m => m.categoryId === cat.sh)
    expect(shm.filter(m => m.phase === 'pool').length).toBe(12)
    expect(shm.filter(m => m.phase === 'bracket').length).toBe(4) // 2 demies, finale, petite finale
    expect(shm.find(m => m.phase === 'bracket' && m.round === 1 && m.position === 1)).toMatchObject({ placeholder1: '1er poule A', placeholder2: '2e poule B' })
    expect(sh.bracketRounds.map(r => r.name)).toEqual(['Demi-finales', 'Finale'])
    // mixte à 3 paires : la mieux placée est exemptée, son match n'apparaît pas
    const dx = s.matches.filter(m => m.categoryId === cat.dx)
    expect(dx.length).toBe(2)
    expect(dx.find(m => m.round === 2)!.entry1Id).toBeTruthy()
    // tous les matchs à venir ont une heure estimée
    expect(s.matches.filter(m => m.status === 'pending').every(m => m.estimatedStart !== null)).toBe(true)
    // inscription close une fois le tableau tiré
    const late = await org('POST', `/organizer/tournaments/${tid}/registrations`, { categoryId: cat.sh, player: { firstName: 'A', lastName: 'B' } })
    expect(late.status).toBe(409)
  })

  it('lance les matchs sur les terrains sans conflit de joueur', async () => {
    await org('PATCH', `/organizer/tournaments/${tid}`, { status: 'running' })
    const r = await org('POST', `/organizer/tournaments/${tid}/auto-call`, {})
    expect(r.data.called).toBe(3)
    const s = await snap()
    const live = s.matches.filter(m => m.status === 'called')
    expect(live.length).toBe(3)
    expect(new Set(live.map(m => m.courtId)).size).toBe(3)
    const entries = new Map(s.categories.flatMap(c => c.entries.map(e => [e.id, e] as const)))
    const players = live.flatMap(m => [m.entry1Id!, m.entry2Id!]).flatMap(id => entries.get(id)!.players.map(p => p.id))
    expect(new Set(players).size).toBe(players.length)
    expect(live.every(m => m.round === 1)).toBe(true)
    // terrain occupé
    const other = s.matches.find(m => m.status === 'pending' && m.entry1Id && m.entry2Id)!
    expect((await org('POST', `/organizer/matches/${other.id}/call`, { courtId: live[0]!.courtId })).status).toBe(409)
    expect((await anon('POST', `/organizer/matches/${live[0]!.id}/start`)).status).toBe(401)
  })

  it('suit un joueur et reçoit les alertes', async () => {
    const s = await snap()
    const m = s.matches.find(x => x.status === 'called')!
    const entries = new Map(s.categories.flatMap(c => c.entries.map(e => [e.id, e] as const)))
    const p = entries.get(m.entry1Id!)!.players[0]!
    expect((await anon('POST', '/follows', { playerId: p.id, isMe: true })).status).toBe(200)
    expect(((await anon('GET', '/follows')).data as unknown[]).length).toBe(1)
    await notifyTick(h.ctx, tid)
    await notifyTick(h.ctx, tid)
    const notes = (await anon('GET', '/notifications')).data as { title: string, body: string }[]
    expect(notes.filter(n => n.title.startsWith('Appel')).length).toBe(1) // une seule fois
    expect(notes[0]!.body).toContain(p.name)
  })

  it('saisit les scores en direct et refuse les scores impossibles', async () => {
    const s = await snap()
    const [m1, m2, m3] = s.matches.filter(x => x.status === 'called')
    await org('POST', `/organizer/matches/${m1!.id}/start`)
    expect((await org('POST', `/organizer/matches/${m1!.id}/score`, { sets: [{ a: 22, b: 5 }] })).status).toBe(400)
    expect((await org('POST', `/organizer/matches/${m1!.id}/score`, { sets: [{ a: 5, b: 3 }] })).data.status).toBe('playing')
    expect((await snap()).matches.find(x => x.id === m1!.id)!.sets).toEqual([{ a: 5, b: 3 }])
    h.advance(25)
    const done = await org('POST', `/organizer/matches/${m1!.id}/score`, { sets: [{ a: 21, b: 12 }, { a: 21, b: 18 }] })
    expect(done.data).toMatchObject({ status: 'completed', winnerSide: 1 })
    expect((await org('POST', `/organizer/matches/${m2!.id}/result`, { sets: [{ a: 21, b: 12 }] })).status).toBe(400)
    expect((await org('POST', `/organizer/matches/${m2!.id}/result`, { sets: [{ a: 12, b: 21 }, { a: 21, b: 19 }, { a: 19, b: 21 }] })).status).toBe(200)
    expect((await org('POST', `/organizer/matches/${m3!.id}/result`, { resultType: 'retired', winner: 2, sets: [{ a: 11, b: 4 }] })).status).toBe(200)
    const after = await snap()
    expect(after.courts.every(c => c.matchId === null)).toBe(true)
    expect(after.matches.find(x => x.id === m3!.id)).toMatchObject({ status: 'completed', resultType: 'retired', winnerSide: 2 })
  })

  it('applique un changement de format aux seuls matchs restants', async () => {
    const before = await snap()
    const done = before.matches.find(m => m.categoryId === cat.sh && m.status === 'completed' && m.resultType === 'normal')!
    expect((await org('PATCH', `/organizer/categories/${cat.sh}`, { poolRules: { bestOf: 1, pointsPerSet: 21, winByTwo: true, cap: 30 } })).status).toBe(200)
    const s = await snap()
    expect(s.matches.find(m => m.id === done.id)!.rulesText).toContain('2 sets gagnants')
    const todo = s.matches.find(m => m.categoryId === cat.sh && m.phase === 'pool' && m.status === 'pending')!
    expect(todo.rulesText).toContain('1 set de 21')
    expect((await org('POST', `/organizer/matches/${todo.id}/result`, { sets: [{ a: 21, b: 10 }] })).status).toBe(200)
    // correction d'un match joué sous l'ancien format : toujours en 2 sets gagnants
    expect((await org('POST', `/organizer/matches/${done.id}/result`, { sets: [{ a: 21, b: 10 }] })).status).toBe(400)
    const j = (await org('GET', `/organizer/tournaments/${tid}/journal`)).data as { message: string }[]
    expect(j.some(x => x.message.includes('format de score changé'))).toBe(true)
  })

  it('gère un retrait avec annulation des résultats, puis la fin des poules', async () => {
    let s = await snap()
    const sh = s.categories[0]!
    const poolB = sh.pools[1]!
    const victim = poolB.standings[3]!.id
    expect((await org('POST', `/organizer/registrations/${victim}/withdraw`, { mode: 'annul', reason: 'blessure' })).status).toBe(200)
    s = await snap()
    const inB = s.matches.filter(m => m.poolId === poolB.id)
    expect(inB.filter(m => m.status === 'cancelled').length).toBe(3)
    expect(s.categories[0]!.pools[1]!.standings.at(-1)).toMatchObject({ id: victim, withdrawn: true })
    // on termine toutes les poules : le premier inscrit gagne toujours
    for (let guard = 0; guard < 30; guard++) {
      s = await snap()
      const m = s.matches.find(x => x.categoryId === cat.sh && x.phase === 'pool' && x.status !== 'completed' && x.status !== 'cancelled')
      if (!m) break
      await org('POST', `/organizer/matches/${m.id}/result`, { sets: [{ a: 21, b: 15 }] })
    }
    s = await snap()
    const c = s.categories[0]!
    expect(c.pools.every(p => p.complete)).toBe(true)
    const semis = s.matches.filter(m => m.categoryId === cat.sh && m.phase === 'bracket' && m.round === 1)
    expect(semis.every(m => m.entry1Id && m.entry2Id)).toBe(true)
    expect(semis[0]!.entry1Id).toBe(c.pools[0]!.standings[0]!.id)
    expect(semis[0]!.entry2Id).toBe(c.pools[1]!.standings[1]!.id)
    expect(semis[1]!.entry1Id).toBe(c.pools[1]!.standings[0]!.id)
  })

  it('fait avancer le tableau, gère forfait et correction', async () => {
    let s = await snap()
    const [d1, d2] = s.matches.filter(m => m.categoryId === cat.sh && m.phase === 'bracket' && m.round === 1)
    const final = s.matches.find(m => m.categoryId === cat.sh && m.phase === 'bracket' && m.round === 2 && !m.thirdPlace)!
    const third = s.matches.find(m => m.thirdPlace)!
    expect(final.placeholder1).toBe(`Vainqueur match ${d1!.number}`)
    expect(third.placeholder1).toBe(`Perdant match ${d1!.number}`)
    await org('POST', `/organizer/matches/${d1!.id}/result`, { sets: [{ a: 21, b: 10 }, { a: 21, b: 10 }] })
    s = await snap()
    expect(s.matches.find(m => m.id === final.id)!.entry1Id).toBe(d1!.entry1Id)
    expect(s.matches.find(m => m.id === third.id)!.entry1Id).toBe(d1!.entry2Id)
    // correction : en fait c'est l'autre qui a gagné
    await org('POST', `/organizer/matches/${d1!.id}/result`, { sets: [{ a: 10, b: 21 }, { a: 10, b: 21 }] })
    s = await snap()
    expect(s.matches.find(m => m.id === final.id)!.entry1Id).toBe(d1!.entry2Id)
    // forfait en demi-finale 2 par retrait : l'adversaire passe, le forfait ne joue pas la petite finale
    await org('POST', `/organizer/registrations/${d2!.entry1Id}/withdraw`, { mode: 'walkover' })
    s = await snap()
    expect(s.matches.find(m => m.id === d2!.id)).toMatchObject({ status: 'completed', resultType: 'walkover', winnerSide: 2 })
    expect(s.matches.find(m => m.id === final.id)!.entry2Id).toBe(d2!.entry2Id)
    expect(s.matches.find(m => m.id === third.id)).toMatchObject({ status: 'completed', resultType: 'walkover', winnerSide: 1 })
    await org('POST', `/organizer/matches/${final.id}/result`, { sets: [{ a: 21, b: 19 }, { a: 21, b: 19 }] })
    // la finale est jouée : on ne peut plus inverser la demi-finale
    expect((await org('POST', `/organizer/matches/${d1!.id}/result`, { sets: [{ a: 21, b: 10 }, { a: 21, b: 10 }] })).status).toBe(409)
    s = await snap()
    expect(s.categories[0]!.status).toBe('finished')
  })

  it('ferme un terrain et recalcule les horaires', async () => {
    const before = await snap()
    const last = (s: Snapshot) => Math.max(...s.matches.filter(m => m.estimatedStart).map(m => m.estimatedStart!))
    await org('PATCH', `/organizer/courts/${before.courts[2]!.id}`, { open: false })
    await org('PATCH', `/organizer/courts/${before.courts[1]!.id}`, { open: false })
    const after = await snap()
    expect(last(after)).toBeGreaterThan(last(before))
    expect(after.matches.every(m => m.estimatedCourtId === null || m.estimatedCourtId === before.courts[0]!.id)).toBe(true)
    // une pause repousse tout
    const until = new Date(h.ctx.now().getTime() + 3 * 3600_000).toISOString()
    await org('PATCH', `/organizer/tournaments/${tid}`, { settings: { pausedUntil: until } })
    const paused = await snap()
    expect(Math.min(...paused.matches.filter(m => m.estimatedStart).map(m => m.estimatedStart!))).toBeGreaterThanOrEqual(Date.parse(until))
    await org('PATCH', `/organizer/tournaments/${tid}`, { settings: { pausedUntil: null } })
  })

  it('donne l\'historique d\'un joueur', async () => {
    const found = (await anon('GET', '/players?q=durand')).data as { id: string, name: string }[]
    expect(found[0]!.name).toBe('Paul DURAND')
    const hst = (await anon('GET', `/players/${found[0]!.id}`)).data
    expect(hst.tournaments[0].name).toBe('Tournoi de Noël')
    expect(hst.tournaments[0].categories.map((c: { name: string }) => c.name).sort()).toEqual(['Double Mixte', 'Simple Hommes'])
    expect(hst.stats.played).toBeGreaterThan(2)
    expect(JSON.stringify(hst)).not.toContain('paul@x.fr')
  })

  it('exporte puis réimporte le tournoi à l\'identique', async () => {
    const before = await snap()
    const exp = (await org('GET', `/organizer/tournaments/${tid}/export`)).data
    expect(exp.matches.length).toBeGreaterThan(10)
    expect((await anon('POST', '/organizer/import', exp)).status).toBe(401)
    const imp = await org('POST', '/organizer/import', exp)
    expect(imp.status).toBe(200)
    const after = await snap()
    const strip = (s: Snapshot) => ({ c: s.categories.map(c => ({ ...c, pools: c.pools.map(p => p.standings) })), m: s.matches.map(m => ({ ...m, estimatedStart: null, estimatedCourtId: null })) })
    expect(strip(after)).toEqual(strip(before))
  })

  it('empêche un autre compte de toucher au tournoi, sauf rôle donné', async () => {
    const r = await anon('POST', '/auth/register', { email: 'benevole@club.fr', name: 'Bénévole', password: 'motdepasse1' })
    const vol = h.api(r.data.token)
    const s = await snap()
    const m = s.matches.find(x => x.status === 'pending' && x.entry1Id && x.entry2Id)!
    expect((await vol('POST', `/organizer/matches/${m.id}/result`, { sets: [{ a: 21, b: 3 }, { a: 21, b: 3 }] })).status).toBe(403)
    await org('POST', `/organizer/tournaments/${tid}/staff`, { email: 'benevole@club.fr', role: 'scorer' })
    expect((await vol('POST', `/organizer/matches/${m.id}/result`, { sets: [{ a: 21, b: 3 }, { a: 21, b: 3 }] })).status).toBe(200)
    expect((await vol('PATCH', `/organizer/tournaments/${tid}`, { name: 'Piraté' })).status).toBe(403)
  })
})
