import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { eq } from 'drizzle-orm'
import { createApp } from './app'
import type { Ctx } from './context'
import { openDb, schema } from './db'
import { createMailer } from './mail'
import { createRealtime } from './realtime'
import { notifyTick } from './services/notify'

const port = Number(process.env.PORT ?? 4000)
const { db } = await openDb()
const realtime = createRealtime()
const ctx: Ctx = {
  db, realtime, mailer: createMailer(db), now: () => new Date(),
  appUrl: (process.env.APP_URL ?? `http://localhost:${process.env.NODE_ENV === 'production' ? port : 8081}`).replace(/\/$/, '')
}
const webDir = process.env.PLUME_WEB_DIR ?? fileURLToPath(new URL('../../app/dist', import.meta.url))
const app = createApp(ctx, { webDir })
const server = serve({ fetch: app.fetch, port, hostname: process.env.HOST ?? '0.0.0.0' }, () => {
  console.log(`Plume : serveur prêt sur http://localhost:${port}`)
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) console.log(`        sur le réseau local : http://${i.address}:${port}`)
  }
  console.log(`        base : ${process.env.DATABASE_URL ? 'PostgreSQL' : 'PGlite (dossier local)'}`)
})
realtime.attach(server as unknown as import('node:http').Server)

// Les alertes « préparez-vous » dépendent de l'heure : on réévalue chaque minute les tournois en cours.
setInterval(async () => {
  try {
    const running = await db.select({ id: schema.tournaments.id }).from(schema.tournaments).where(eq(schema.tournaments.status, 'running'))
    for (const t of running) await notifyTick(ctx, t.id)
  } catch (e) { console.error('[tick]', e) }
}, 60_000).unref()
