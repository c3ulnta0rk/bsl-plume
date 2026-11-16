import type { Discipline, Match, RegistrationStatus, TournamentStatus } from './types'

export function hhmm(ms: number | null | undefined): string {
  if (!ms) return '--:--'
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** « dans 12 min », « dans 1 h 30 », « imminent ». */
export function inTime(ms: number, now: number): string {
  const min = Math.round((ms - now) / 60_000)
  if (min <= 1) return 'imminent'
  if (min < 60) return `dans ${min} min`
  const h = Math.floor(min / 60)
  const m = Math.round((min % 60) / 5) * 5
  return m === 0 ? `dans ${h} h` : m === 60 ? `dans ${h + 1} h` : `dans ${h} h ${String(m).padStart(2, '0')}`
}

export function since(ms: number, now: number): string {
  const min = Math.max(0, Math.round((now - ms) / 60_000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function dateFr(iso: string, withDay = true): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  const day = new Date(y, m - 1, d).getDay()
  return `${withDay ? `${DAYS[day]} ` : ''}${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`
}

export const DISCIPLINES: Record<Discipline, string> = {
  SH: 'Simple hommes', SD: 'Simple dames', DH: 'Double hommes', DD: 'Double dames', DX: 'Double mixte'
}
export const isDoubles = (d: Discipline) => d === 'DH' || d === 'DD' || d === 'DX'

export const TOURNAMENT_STATUS: Record<TournamentStatus, string> = {
  draft: 'Brouillon', published: 'À venir', running: 'En cours', finished: 'Terminé'
}
export const REG_STATUS: Record<RegistrationStatus, string> = {
  pending_email: 'Mail à confirmer', pending: 'À valider', accepted: 'Validée', waitlist: 'Liste d\'attente', refused: 'Refusée', withdrawn: 'Retirée'
}

export function resultSuffix(m: Pick<Match, 'resultType'>): string {
  return m.resultType === 'walkover' ? 'Forfait' : m.resultType === 'retired' ? 'Abandon' : ''
}

export function setsText(sets: { a: number, b: number }[]): string {
  return sets.map(s => `${s.a}-${s.b}`).join('  ')
}
