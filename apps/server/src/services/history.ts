import { and, eq, inArray, ne, or } from 'drizzle-orm'
import { roundName } from '@plume/engine'
import { notFound } from '../context'
import type { Db } from '../db'
import { schema } from '../db'
import { poolStandings } from './draw'
import { playerName } from './names'

const { categories, matches, players, registrations, tournaments } = schema

/** Historique public d'un joueur : tournois, tableaux, résultats et matchs. */
export async function playerHistory(db: Db, playerId: string) {
  const [p] = await db.select().from(players).where(eq(players.id, playerId))
  if (!p) throw notFound('Joueur introuvable.')
  const regs = await db.select().from(registrations).where(and(or(eq(registrations.player1Id, playerId), eq(registrations.player2Id, playerId)), inArray(registrations.status, ['accepted', 'withdrawn'])))
  const out: {
    slug: string, name: string, date: string, location: string
    categories: { id: string, name: string, partner: string | null, result: string, matches: { id: string, label: string, opponent: string, won: boolean | null, sets: { a: number, b: number }[], resultType: string | null, status: string }[] }[]
  }[] = []
  let played = 0
  let won = 0
  if (regs.length > 0) {
    const ts = await db.select().from(tournaments).where(and(inArray(tournaments.id, [...new Set(regs.map(r => r.tournamentId))]), ne(tournaments.status, 'draft')))
    const cats = await db.select().from(categories).where(inArray(categories.id, regs.map(r => r.categoryId)))
    for (const t of ts.sort((a, b) => b.startDate.localeCompare(a.startDate))) {
      const entry = { slug: t.slug, name: t.name, date: t.startDate, location: t.location, categories: [] as typeof out[number]['categories'] }
      for (const reg of regs.filter(r => r.tournamentId === t.id)) {
        const cat = cats.find(c => c.id === reg.categoryId)
        if (!cat) continue
        const cm = await db.select().from(matches).where(eq(matches.categoryId, cat.id))
        const mine = cm.filter(m => (m.entry1Id === reg.id || m.entry2Id === reg.id) && m.resultType !== 'bye' && m.status !== 'cancelled').sort((a, b) => a.number - b.number)
        const oppIds = [...new Set(mine.map(m => (m.entry1Id === reg.id ? m.entry2Id : m.entry1Id)).filter((x): x is string => !!x))]
        const oppRegs = oppIds.length ? await db.select().from(registrations).where(inArray(registrations.id, oppIds)) : []
        const pIds = [...new Set([...oppRegs.flatMap(r => [r.player1Id, r.player2Id]), reg.player1Id, reg.player2Id].filter((x): x is string => !!x))]
        const pls = await db.select().from(players).where(inArray(players.id, pIds))
        const nameOf = (r: typeof reg | undefined) => (r ? [r.player1Id, r.player2Id].filter(Boolean).map(id => pls.find(x => x.id === id)).filter(Boolean).map(x => playerName(x!)).join(' / ') : 'À déterminer')
        const totalRounds = Math.max(0, ...cm.filter(m => m.phase === 'bracket').map(m => m.round))
        const rows = mine.map((m) => {
          const side = m.entry1Id === reg.id ? 1 : 2
          const isWon = m.status === 'completed' && m.winnerSide ? m.winnerSide === side : null
          if (isWon !== null) { played++; if (isWon) won++ }
          return {
            id: m.id,
            label: m.phase === 'pool' ? 'Poule' : m.thirdPlace ? '3e place' : roundName(m.round, totalRounds),
            opponent: nameOf(oppRegs.find(r => r.id === (side === 1 ? m.entry2Id : m.entry1Id))),
            won: isWon,
            sets: side === 1 ? m.sets : m.sets.map(s => ({ a: s.b, b: s.a })),
            resultType: m.resultType, status: m.status
          }
        })
        // résultat final dans le tableau
        let result = reg.status === 'withdrawn' ? 'Forfait' : 'Inscrit'
        const bracket = mine.filter(m => m.phase === 'bracket' && m.status === 'completed')
        const final = bracket.find(m => m.round === totalRounds && !m.thirdPlace)
        const third = bracket.find(m => m.thirdPlace)
        const wonMatch = (m: typeof mine[number]) => m.winnerSide === (m.entry1Id === reg.id ? 1 : 2)
        if (reg.status !== 'withdrawn') {
          if (final) result = wonMatch(final) ? 'Vainqueur' : 'Finaliste'
          else if (third) result = wonMatch(third) ? '3e' : '4e'
          else if (bracket.length > 0) {
            const last = bracket[bracket.length - 1]!
            result = wonMatch(last) ? 'En cours' : roundName(last.round, totalRounds).replace(/s de finale$/, ' de finale').replace('Demi-finales', 'Demi-finale')
          } else if (mine.some(m => m.phase === 'pool')) {
            const st = await poolStandings(db, cat)
            const pool = st.find(s => s.rows.some(r => r.id === reg.id))
            const row = pool?.rows.find(r => r.id === reg.id)
            if (pool && row) {
              const inFinal = cat.format.type === 'pools' && st.length === 1
              result = pool.complete ? (inFinal && row.rank === 1 ? 'Vainqueur' : `${row.rank === 1 ? '1er' : `${row.rank}e`} de poule`) : 'En cours'
            }
          }
        }
        const partnerId = reg.player1Id === playerId ? reg.player2Id : reg.player1Id
        const partner = partnerId && partnerId !== playerId ? pls.find(x => x.id === partnerId) : null
        entry.categories.push({ id: cat.id, name: cat.name, partner: partner ? playerName(partner) : null, result, matches: rows })
      }
      if (entry.categories.length > 0) out.push(entry)
    }
  }
  return { player: { id: p.id, name: playerName(p), club: p.club, hasLicence: !!p.licence }, stats: { played, won }, tournaments: out }
}
