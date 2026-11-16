import { createApp } from '../src/app'
import type { Ctx } from '../src/context'
import { openDb } from '../src/db'
import { createMailer } from '../src/mail'

export async function setup() {
  process.env.PLUME_NO_PUSH = '1'
  const { db, close } = await openDb({ dataDir: null })
  let clock = new Date('2026-12-05T08:00:00Z').getTime()
  const events: unknown[] = []
  const ctx: Ctx = {
    db, mailer: createMailer(db), appUrl: 'http://test', now: () => new Date(clock),
    realtime: { tournamentChanged: id => events.push(id), toDevice: (d, p) => events.push([d, p]) }
  }
  const app = createApp(ctx)
  const api = (token?: string, device?: string) => async <T = any>(method: string, path: string, body?: unknown): Promise<{ status: number, data: T }> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const res = await app.request(`/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(device ? { 'x-device-id': device } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    return { status: res.status, data: await res.json() as T }
  }
  return { ctx, app, api, close, events, advance: (min: number) => { clock += min * 60_000 } }
}
