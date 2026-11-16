import nodemailer from 'nodemailer'
import { eq } from 'drizzle-orm'
import type { Mailer } from './context'
import type { Db } from './db'
import { schema } from './db'

/**
 * Tous les mails passent par la table `outbox`. Si SMTP_URL est défini ils sont réellement envoyés,
 * sinon ils restent consultables (développement, mode salle sans Internet).
 */
export function createMailer(db: Db): Mailer {
  const url = process.env.SMTP_URL
  const from = process.env.MAIL_FROM ?? 'Plume <no-reply@localhost>'
  const transport = url ? nodemailer.createTransport(url) : null
  return {
    async send(to, subject, body) {
      const [row] = await db.insert(schema.outbox).values({ to, subject, body }).returning()
      if (!transport) {
        if (process.env.NODE_ENV !== 'test') console.log(`[mail non envoyé, SMTP_URL absent] à ${to} : ${subject}\n${body}\n`)
        return
      }
      try {
        await transport.sendMail({ from, to, subject, text: body })
        await db.update(schema.outbox).set({ sent: true }).where(eq(schema.outbox.id, row!.id))
      } catch (e) {
        console.error('[mail] échec', e)
      }
    }
  }
}
