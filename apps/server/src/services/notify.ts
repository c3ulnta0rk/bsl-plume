import { eq, inArray } from 'drizzle-orm'
import webpush from 'web-push'
import type { Ctx } from '../context'
import { schema } from '../db'
import { buildSnapshot } from './snapshot'

const { follows, notifications, pushSubscriptions, settings } = schema

let vapid: { publicKey: string, privateKey: string } | null = null

/** Clés d'envoi des notifications web : générées une fois puis conservées en base. */
export async function vapidKeys(ctx: Ctx): Promise<{ publicKey: string, privateKey: string }> {
  if (vapid) return vapid
  const [row] = await ctx.db.select().from(settings).where(eq(settings.key, 'vapid'))
  if (row) vapid = row.value as { publicKey: string, privateKey: string }
  else {
    vapid = webpush.generateVAPIDKeys()
    await ctx.db.insert(settings).values({ key: 'vapid', value: vapid }).onConflictDoNothing()
  }
  return vapid
}

interface Notice { key: string, playerIds: string[], title: string, body: string, matchId: string, url: string }

async function deliver(ctx: Ctx, tournamentId: string, notices: Notice[]): Promise<void> {
  if (notices.length === 0) return
  const playerIds = [...new Set(notices.flatMap(n => n.playerIds))]
  if (playerIds.length === 0) return
  const fs = await ctx.db.select().from(follows).where(inArray(follows.playerId, playerIds))
  if (fs.length === 0) return
  const subs = await ctx.db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.deviceId, [...new Set(fs.map(f => f.deviceId))]))
  for (const n of notices) {
    const devices = [...new Set(fs.filter(f => n.playerIds.includes(f.playerId)).map(f => f.deviceId))]
    for (const deviceId of devices) {
      const inserted = await ctx.db.insert(notifications).values({ deviceId, key: n.key, tournamentId, matchId: n.matchId, title: n.title, body: n.body, url: n.url }).onConflictDoNothing().returning()
      if (inserted.length === 0) continue
      ctx.realtime.toDevice(deviceId, { type: 'notification', notification: inserted[0] })
      const sub = subs.find(s => s.deviceId === deviceId)
      if (sub) void push(ctx, sub, n).catch(() => {})
    }
  }
}

async function push(ctx: Ctx, sub: typeof pushSubscriptions.$inferSelect, n: Notice): Promise<void> {
  if (process.env.PLUME_NO_PUSH === '1') return
  if (sub.kind === 'web') {
    const keys = await vapidKeys(ctx)
    try {
      await webpush.sendNotification(sub.payload as unknown as webpush.PushSubscription, JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.key }), {
        vapidDetails: { subject: process.env.PLUME_CONTACT ?? 'mailto:contact@example.org', ...keys }, TTL: 600
      })
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await ctx.db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, sub.deviceId))
    }
  } else {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: (sub.payload as { token: string }).token, title: n.title, body: n.body, data: { url: n.url }, sound: 'default' })
    })
  }
}

/** Minutes avant le début estimé à partir desquelles on prévient « préparez-vous ». */
const SOON_MINUTES = 12

/**
 * Examine l'état du tournoi et envoie les alertes dues : appel sur un terrain,
 * match imminent, résultat. Chaque alerte n'est envoyée qu'une fois par appareil.
 */
export async function notifyTick(ctx: Ctx, tournamentId: string): Promise<void> {
  const snap = await buildSnapshot(ctx.db, tournamentId, ctx.now())
  if (snap.tournament.status !== 'running') return
  const entries = new Map(snap.categories.flatMap(c => c.entries.map(e => [e.id, e] as const)))
  const court = (id: string | null) => snap.courts.find(c => c.id === id)?.name ?? 'un terrain'
  const url = `/t/${snap.tournament.slug}/moi`
  const notices: Notice[] = []
  for (const m of snap.matches) {
    const e1 = m.entry1Id ? entries.get(m.entry1Id) : undefined
    const e2 = m.entry2Id ? entries.get(m.entry2Id) : undefined
    if (!e1 || !e2) continue
    const playerIds = [...e1.players, ...e2.players].map(p => p.id)
    const versus = `${e1.name} contre ${e2.name}`
    if (m.status === 'called') {
      notices.push({ key: `called:${m.id}:${m.calledAt}`, playerIds, matchId: m.id, url, title: `Appel : ${court(m.courtId)}`, body: `${versus}. Présentez-vous sur ${court(m.courtId)}.` })
    } else if (m.status === 'pending' && m.estimatedStart && m.estimatedStart - snap.serverTime <= SOON_MINUTES * 60_000) {
      const min = Math.max(1, Math.round((m.estimatedStart - snap.serverTime) / 60_000))
      notices.push({ key: `soon:${m.id}`, playerIds, matchId: m.id, url, title: 'Préparez-vous', body: `${versus} : début estimé dans environ ${min} min.` })
    } else if (m.status === 'completed' && m.endedAt && snap.serverTime - m.endedAt < 15 * 60_000 && m.winnerSide) {
      const score = m.resultType === 'walkover' ? 'forfait' : m.sets.map(s => `${s.a}-${s.b}`).join(' ') + (m.resultType === 'retired' ? ' (abandon)' : '')
      notices.push({ key: `result:${m.id}:${m.winnerSide}`, playerIds, matchId: m.id, url, title: `Victoire de ${(m.winnerSide === 1 ? e1 : e2).name}`, body: `${versus} : ${score}` })
    }
  }
  await deliver(ctx, tournamentId, notices)
}

/** À appeler après tout changement : rafraîchit les écrans et envoie les alertes. */
export function changed(ctx: Ctx, tournamentId: string): void {
  ctx.realtime.tournamentChanged(tournamentId)
  void notifyTick(ctx, tournamentId).catch((e) => { if (process.env.NODE_ENV !== 'test') console.error('[notify]', e) })
}
