import type { Server } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import type { Realtime } from './context'

interface Client { ws: WebSocket, tournament: string | null, deviceId: string | null }

/**
 * Temps réel par WebSocket. Le serveur ne pousse que « ce tournoi a changé » :
 * les écrans rechargent alors leur état, ce qui reste simple et robuste sur un réseau de salle.
 */
export function createRealtime(): Realtime & { attach: (server: Server) => void, clients: () => number } {
  const clients = new Set<Client>()
  const pending = new Map<string, NodeJS.Timeout>()
  const send = (c: Client, payload: unknown) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(payload))
  }
  return {
    clients: () => clients.size,
    attach(server) {
      const wss = new WebSocketServer({ server, path: '/ws' })
      wss.on('connection', (ws, req) => {
        const url = new URL(req.url ?? '/', 'http://x')
        const client: Client = { ws, tournament: url.searchParams.get('tournament'), deviceId: url.searchParams.get('device') }
        clients.add(client)
        ws.on('close', () => clients.delete(client))
        ws.on('error', () => clients.delete(client))
        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(String(raw)) as { type?: string, tournament?: string }
            if (msg.type === 'watch') client.tournament = msg.tournament ?? null
            if (msg.type === 'ping') send(client, { type: 'pong' })
          } catch { /* message ignoré */ }
        })
        send(client, { type: 'hello' })
      })
    },
    tournamentChanged(tournamentId) {
      // regroupe les rafales (saisie point par point) en un seul signal
      if (pending.has(tournamentId)) return
      pending.set(tournamentId, setTimeout(() => {
        pending.delete(tournamentId)
        for (const c of clients) if (c.tournament === tournamentId) send(c, { type: 'changed', tournament: tournamentId })
      }, 80))
    },
    toDevice(deviceId, payload) {
      for (const c of clients) if (c.deviceId === deviceId) send(c, payload)
    }
  }
}
