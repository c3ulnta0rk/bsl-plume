import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { userFromToken, type Env } from './auth'
import { HttpError, type Ctx } from './context'
import { organizerRoutes } from './routes/organizer'
import { publicRoutes } from './routes/public'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.map': 'application/json'
}

export function createApp(ctx: Ctx, opts: { webDir?: string | null } = {}) {
  const app = new Hono<Env>()
  app.use('/api/*', cors({ origin: o => o ?? '*', allowHeaders: ['content-type', 'authorization', 'x-device-id'], allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }))
  app.use('/api/*', async (c, next) => {
    c.set('ctx', ctx)
    c.set('deviceId', c.req.header('x-device-id')?.slice(0, 80) ?? null)
    c.set('user', await userFromToken(ctx, c.req.header('authorization')?.replace(/^Bearer /, '')))
    c.header('cache-control', 'no-store')
    await next()
  })
  app.get('/api/health', c => c.json({ ok: true, time: ctx.now().toISOString() }))
  app.route('/api', publicRoutes)
  app.route('/api/organizer', organizerRoutes)
  app.all('/api/*', c => c.json({ error: 'Route inconnue.' }, 404))
  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status)
    if (err instanceof SyntaxError) return c.json({ error: 'Requête illisible.' }, 400)
    console.error(err)
    return c.json({ error: 'Erreur interne. Réessayez.' }, 500)
  })

  // Site web (export statique d'Expo) servi par le même serveur : une seule adresse à ouvrir dans la salle.
  const webDir = opts.webDir
  if (webDir && existsSync(join(webDir, 'index.html'))) {
    app.get('*', (c) => {
      const path = normalize(decodeURIComponent(new URL(c.req.url).pathname)).replace(/^(\.\.[/\\])+/, '')
      let file = join(webDir, path)
      if (!file.startsWith(webDir) || !existsSync(file) || !extname(file)) {
        const html = join(webDir, `${path.replace(/\/$/, '')}.html`)
        file = existsSync(html) && html.startsWith(webDir) ? html : join(webDir, 'index.html')
      }
      const ext = extname(file)
      return c.body(new Uint8Array(readFileSync(file)), 200, {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        'cache-control': ext === '.html' || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=31536000, immutable'
      })
    })
  }
  return app
}
