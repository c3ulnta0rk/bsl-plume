import type { schema } from '../db'

type Player = typeof schema.players.$inferSelect

export function playerName(p: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName.toUpperCase()}`.trim()
}

export function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'tournoi'
}

export function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
}
