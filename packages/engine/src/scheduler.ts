/**
 * Planification des terrains.
 * Objectifs : occuper tous les terrains, faire avancer toutes les poules au même rythme,
 * respecter un temps de repos, et donner à chaque joueur une heure estimée fiable.
 */

export interface SchedMatch {
  id: string
  status: 'pending' | 'called' | 'playing' | 'completed' | 'cancelled'
  /** Rang global de passage : tour de poule, puis tours de tableau à la suite. */
  stage: number
  /** Ordre de priorité de la catégorie (départage). */
  categoryOrder: number
  /** Joueurs de chaque côté, si connus. */
  players1: string[] | null
  players2: string[] | null
  /** Matchs dont le résultat est attendu avant de connaître les joueurs. */
  dependsOn: string[]
  /** Durée moyenne attendue, en minutes. */
  minutes: number
  courtId?: string | null
  startedAt?: number | null
  calledAt?: number | null
  endedAt?: number | null
  /** Numéro d'affichage, sert de dernier départage stable. */
  number: number
}

export interface SchedCourt { id: string, open: boolean }

export interface SchedOptions {
  now: number
  /** Repos minimal entre deux matchs d'un même joueur, en minutes. */
  restMinutes: number
  /** Délai entre l'appel et le début effectif, en minutes. */
  callMinutes?: number
  /** Heure avant laquelle aucun match ne peut être lancé (début du tournoi, pause). */
  notBefore?: number | null
}

export interface Estimate { matchId: string, start: number, courtId: string | null }

const MIN = 60_000

function rank(a: SchedMatch, b: SchedMatch, waitA: number, waitB: number): number {
  return a.stage - b.stage || waitA - waitB || a.categoryOrder - b.categoryOrder || a.number - b.number
}

/**
 * Prochains matchs à lancer maintenant, dans l'ordre, pour `count` terrains libres.
 * Un joueur ne peut pas être appelé s'il joue déjà ; le repos est respecté tant que possible.
 */
export function suggestNext(matches: SchedMatch[], count: number, opts: SchedOptions): SchedMatch[] {
  const busy = new Set<string>()
  const lastEnd = new Map<string, number>()
  for (const m of matches) {
    const players = [...(m.players1 ?? []), ...(m.players2 ?? [])]
    if (m.status === 'called' || m.status === 'playing') players.forEach(p => busy.add(p))
    if (m.status === 'completed' && m.endedAt) {
      for (const p of players) lastEnd.set(p, Math.max(lastEnd.get(p) ?? 0, m.endedAt))
    }
  }
  const picked: SchedMatch[] = []
  const ready = matches.filter(m => m.status === 'pending' && m.players1 && m.players2 && m.players1.length > 0 && m.players2.length > 0)
  const availableAt = (m: SchedMatch) => Math.max(0, ...[...m.players1!, ...m.players2!].map(p => (lastEnd.get(p) ?? 0) + (lastEnd.has(p) ? opts.restMinutes * MIN : 0)))
  for (const strict of [true, false]) {
    while (picked.length < count) {
      const pool = ready
        .filter(m => !picked.includes(m))
        .filter(m => ![...m.players1!, ...m.players2!].some(p => busy.has(p)))
        .filter(m => !strict || availableAt(m) <= opts.now)
        .sort((a, b) => rank(a, b, availableAt(a), availableAt(b)))
      const next = pool[0]
      if (!next) break
      picked.push(next);
      [...next.players1!, ...next.players2!].forEach(p => busy.add(p))
    }
  }
  return picked
}

/**
 * Simule la suite du tournoi pour estimer l'heure de début de chaque match restant.
 * Les matchs dont les joueurs ne sont pas encore connus sont planifiés après ceux dont ils dépendent.
 */
export function estimateSchedule(matches: SchedMatch[], courts: SchedCourt[], opts: SchedOptions): Estimate[] {
  const call = (opts.callMinutes ?? 3) * MIN
  const rest = opts.restMinutes * MIN
  const start0 = Math.max(opts.now, opts.notBefore ?? 0)
  const byId = new Map(matches.map(m => [m.id, m]))
  const openCourts = courts.filter(c => c.open)
  const courtFree = new Map<string, number>(openCourts.map(c => [c.id, start0]))
  const playerFree = new Map<string, number>()
  const end = new Map<string, number>()
  const out: Estimate[] = []

  const setPlayers = (m: SchedMatch, t: number) => {
    for (const p of [...(m.players1 ?? []), ...(m.players2 ?? [])]) playerFree.set(p, Math.max(playerFree.get(p) ?? 0, t))
  }
  for (const m of matches) {
    if (m.status === 'completed' || m.status === 'cancelled') {
      end.set(m.id, m.endedAt ?? 0)
      if (m.status === 'completed' && m.endedAt) setPlayers(m, m.endedAt + rest)
    } else if (m.status === 'playing' || m.status === 'called') {
      const begun = m.status === 'playing' ? (m.startedAt ?? opts.now) : (m.calledAt ?? opts.now) + call
      // un match qui déborde est supposé finir dans quelques minutes
      const finish = Math.max(begun + m.minutes * MIN, opts.now + 4 * MIN)
      end.set(m.id, finish)
      setPlayers(m, finish + rest)
      if (m.courtId && courtFree.has(m.courtId)) courtFree.set(m.courtId, Math.max(courtFree.get(m.courtId)!, finish))
      out.push({ matchId: m.id, start: begun, courtId: m.courtId ?? null })
    }
  }
  if (openCourts.length === 0) return out

  const todo = new Set(matches.filter(m => m.status === 'pending').map(m => m.id))
  const readyAt = (m: SchedMatch): number | null => {
    let t = start0
    for (const d of m.dependsOn) {
      if (!byId.has(d)) continue
      const e = end.get(d)
      if (e === undefined) return null
      t = Math.max(t, e + rest)
    }
    for (const p of [...(m.players1 ?? []), ...(m.players2 ?? [])]) t = Math.max(t, playerFree.get(p) ?? 0)
    return t
  }
  let guard = todo.size * 4 + 10
  while (todo.size > 0 && guard-- > 0) {
    // terrain libre le plus tôt
    let courtId = openCourts[0]!.id
    for (const c of openCourts) if (courtFree.get(c.id)! < courtFree.get(courtId)!) courtId = c.id
    const free = courtFree.get(courtId)!
    const cands: { m: SchedMatch, at: number }[] = []
    for (const id of todo) {
      const m = byId.get(id)!
      const at = readyAt(m)
      if (at !== null) cands.push({ m, at })
    }
    if (cands.length === 0) break
    const now = cands.filter(c => c.at <= free)
    let pick: { m: SchedMatch, at: number }
    if (now.length > 0) pick = now.sort((a, b) => rank(a.m, b.m, a.at, b.at))[0]!
    else pick = cands.sort((a, b) => a.at - b.at || rank(a.m, b.m, a.at, b.at))[0]!
    const start = Math.max(free, pick.at) + call
    const finish = start + pick.m.minutes * MIN
    end.set(pick.m.id, finish)
    setPlayers(pick.m, finish + rest)
    courtFree.set(courtId, finish)
    todo.delete(pick.m.id)
    out.push({ matchId: pick.m.id, start, courtId })
  }
  return out
}
