import type { Db } from './db'

export interface Mailer { send: (to: string, subject: string, body: string) => Promise<void> }
export interface Realtime {
  /** Prévient tous les écrans ouverts sur ce tournoi que son état a changé. */
  tournamentChanged: (tournamentId: string) => void
  /** Pousse une alerte vers un appareil connecté. */
  toDevice: (deviceId: string, payload: unknown) => void
}

export interface Ctx {
  db: Db
  mailer: Mailer
  realtime: Realtime
  appUrl: string
  now: () => Date
}

export class HttpError extends Error {
  constructor(public status: 400 | 401 | 403 | 404 | 409, message: string) { super(message) }
}
export const bad = (m: string) => new HttpError(400, m)
export const notFound = (m = 'Introuvable.') => new HttpError(404, m)
export const forbidden = (m = 'Accès refusé.') => new HttpError(403, m)
export const conflict = (m: string) => new HttpError(409, m)
