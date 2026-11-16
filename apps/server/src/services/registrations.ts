import { randomBytes } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { bad, conflict, notFound, type Ctx } from '../context'
import { schema } from '../db'
import { playerName, titleCase } from './names'

const { categories, players, registrations, tournaments } = schema

export interface PersonInput { firstName: string, lastName: string, licence?: string | null, club?: string | null, gender?: 'M' | 'F' | null, email?: string | null }

/** Retrouve la fiche d'un joueur (licence, sinon mail + nom, sinon nom + club) ou la crée. */
export async function findOrCreatePlayer(ctx: Ctx, p: PersonInput, userId: string | null = null): Promise<typeof players.$inferSelect> {
  const firstName = titleCase(p.firstName)
  const lastName = titleCase(p.lastName)
  const licence = p.licence?.trim() || null
  const email = p.email?.trim().toLowerCase() || null
  const club = p.club?.trim() || null
  const sameName = and(sql`lower(${players.firstName}) = ${firstName.toLowerCase()}`, sql`lower(${players.lastName}) = ${lastName.toLowerCase()}`)
  let found: typeof players.$inferSelect | undefined
  if (licence) [found] = await ctx.db.select().from(players).where(eq(players.licence, licence))
  if (!found && email) [found] = await ctx.db.select().from(players).where(and(eq(players.email, email), sameName))
  if (!found && club) [found] = await ctx.db.select().from(players).where(and(sql`lower(${players.club}) = ${club.toLowerCase()}`, sameName))
  if (found) {
    const patch: Partial<typeof players.$inferInsert> = {}
    if (!found.licence && licence) patch.licence = licence
    if (!found.club && club) patch.club = club
    if (!found.email && email) patch.email = email
    if (!found.gender && p.gender) patch.gender = p.gender
    if (!found.userId && userId) patch.userId = userId
    if (Object.keys(patch).length > 0) [found] = await ctx.db.update(players).set(patch).where(eq(players.id, found.id)).returning()
    return found!
  }
  const [created] = await ctx.db.insert(players).values({ firstName, lastName, licence, club, gender: p.gender ?? null, email, userId }).returning()
  return created!
}

export const isDoubles = (d: schema.Discipline) => d === 'DH' || d === 'DD' || d === 'DX'

export interface RegistrationInput extends PersonInput {
  email: string
  phone?: string | null
  note?: string | null
  categories: { categoryId: string, partner?: PersonInput | null }[]
}

/** Dépôt d'une inscription en ligne : une demande par tableau, à confirmer par mail. */
export async function submitRegistration(ctx: Ctx, slug: string, input: RegistrationInput, userId: string | null): Promise<{ count: number }> {
  const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.slug, slug))
  if (!t || t.status === 'draft') throw notFound('Tournoi introuvable.')
  if (!t.registrationOpen || t.status === 'finished') throw conflict('Les inscriptions sont closes pour ce tournoi.')
  const deadline = t.settings.registrationDeadline
  if (deadline && ctx.now().getTime() > Date.parse(deadline) + 86_400_000) throw conflict('La date limite d\'inscription est dépassée.')
  if (input.categories.length === 0) throw bad('Choisissez au moins un tableau.')
  const cats = await ctx.db.select().from(categories).where(and(eq(categories.tournamentId, t.id), inArray(categories.id, input.categories.map(c => c.categoryId))))
  if (cats.length !== new Set(input.categories.map(c => c.categoryId)).size) throw bad('Un des tableaux choisis n\'existe pas.')
  const me = await findOrCreatePlayer(ctx, input, userId)
  const token = randomBytes(24).toString('base64url')
  const lines: string[] = []
  for (const choice of input.categories) {
    const cat = cats.find(c => c.id === choice.categoryId)!
    if (cat.status !== 'registration') throw conflict(`Le tableau « ${cat.name} » est déjà tiré : contactez l'organisateur.`)
    let partner: typeof players.$inferSelect | null = null
    if (isDoubles(cat.discipline)) {
      if (!choice.partner?.firstName?.trim() || !choice.partner?.lastName?.trim()) throw bad(`Indiquez votre partenaire pour « ${cat.name} ».`)
      partner = await findOrCreatePlayer(ctx, choice.partner)
      if (partner.id === me.id) throw bad('Votre partenaire ne peut pas être vous-même.')
    }
    const existing = await ctx.db.select().from(registrations).where(and(eq(registrations.categoryId, cat.id), inArray(registrations.status, ['pending_email', 'pending', 'accepted', 'waitlist'])))
    const ids = [me.id, partner?.id].filter(Boolean)
    if (existing.some(r => ids.includes(r.player1Id) || (r.player2Id && ids.includes(r.player2Id)))) {
      throw conflict(`Une inscription existe déjà pour « ${cat.name} » avec ce joueur.`)
    }
    await ctx.db.insert(registrations).values({
      tournamentId: t.id, categoryId: cat.id, player1Id: me.id, player2Id: partner?.id ?? null,
      email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || null, note: input.note?.trim() || null,
      status: 'pending_email', source: 'online', confirmToken: token
    })
    lines.push(`- ${cat.name}${partner ? ` avec ${playerName(partner)}` : ''}`)
  }
  await ctx.mailer.send(input.email.trim().toLowerCase(), `Confirmez votre inscription : ${t.name}`,
    `Bonjour ${titleCase(input.firstName)},\n\nVous avez demandé à participer à « ${t.name} » :\n${lines.join('\n')}\n\n`
    + `Confirmez votre adresse en ouvrant ce lien :\n${ctx.appUrl}/confirmer?token=${token}\n\n`
    + `L'organisateur validera ensuite votre inscription et vous recevrez un nouveau message.\n`)
  return { count: lines.length }
}

export async function confirmRegistration(ctx: Ctx, token: string): Promise<{ slug: string, name: string, categories: string[] }> {
  const regs = await ctx.db.select().from(registrations).where(eq(registrations.confirmToken, token))
  if (regs.length === 0) throw notFound('Ce lien de confirmation n\'est pas valide.')
  const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, regs[0]!.tournamentId))
  const cats = await ctx.db.select().from(categories).where(inArray(categories.id, regs.map(r => r.categoryId)))
  await ctx.db.update(registrations).set({ status: 'pending' }).where(and(eq(registrations.confirmToken, token), eq(registrations.status, 'pending_email')))
  return { slug: t!.slug, name: t!.name, categories: cats.map(c => c.name) }
}

/** Décision de l'organisateur : valider, refuser, mettre en attente, déplacer dans un autre tableau, tête de série. */
export async function decideRegistration(ctx: Ctx, id: string, patch: { status?: schema.RegistrationStatus, categoryId?: string, seed?: number | null, organizerNote?: string | null }) {
  const [reg] = await ctx.db.select().from(registrations).where(eq(registrations.id, id))
  if (!reg) throw notFound('Inscription introuvable.')
  const [t] = await ctx.db.select().from(tournaments).where(eq(tournaments.id, reg.tournamentId))
  const [from] = await ctx.db.select().from(categories).where(eq(categories.id, reg.categoryId))
  let to = from!
  if (patch.categoryId && patch.categoryId !== reg.categoryId) {
    const [c] = await ctx.db.select().from(categories).where(and(eq(categories.id, patch.categoryId), eq(categories.tournamentId, reg.tournamentId)))
    if (!c) throw notFound('Tableau introuvable.')
    if (isDoubles(c.discipline) !== isDoubles(from!.discipline)) throw bad('Impossible de déplacer entre un tableau de simple et un tableau de double.')
    if (from!.status !== 'registration' || c.status !== 'registration') throw conflict('Un des deux tableaux est déjà tiré : annulez le tirage ou passez par un retrait.')
    to = c
  }
  if (patch.status === 'accepted' && reg.status !== 'accepted') {
    if (to.status !== 'registration') throw conflict('Ce tableau est déjà tiré : annulez le tirage pour ajouter un inscrit.')
    const [{ n } = { n: 0 }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(registrations).where(and(eq(registrations.categoryId, to.id), eq(registrations.status, 'accepted')))
    if (n >= to.maxEntries) throw conflict(`« ${to.name} » est complet (${to.maxEntries} places). Augmentez le nombre de places ou mettez l'inscription en liste d'attente.`)
  }
  if (patch.status && reg.status === 'accepted' && patch.status !== 'accepted' && from!.status !== 'registration') {
    throw conflict('Le tableau est tiré : utilisez « Retirer du tableau » pour gérer un forfait.')
  }
  const [u] = await ctx.db.update(registrations).set({
    status: patch.status ?? reg.status, categoryId: to.id,
    seed: patch.seed === undefined ? reg.seed : patch.seed,
    organizerNote: patch.organizerNote === undefined ? reg.organizerNote : patch.organizerNote
  }).where(eq(registrations.id, id)).returning()
  if (reg.email && t) {
    const moved = to.id !== from!.id ? `\nVotre inscription a été placée dans le tableau « ${to.name} » (au lieu de « ${from!.name} »).` : ''
    const note = u!.organizerNote ? `\nMessage de l'organisateur : ${u!.organizerNote}` : ''
    const link = `\n\n${ctx.appUrl}/t/${t.slug}`
    if (patch.status === 'accepted' && reg.status !== 'accepted') {
      await ctx.mailer.send(reg.email, `Inscription validée : ${t.name}`, `Bonjour,\n\nVotre inscription au tableau « ${to.name} » de « ${t.name} » est validée.${moved}${note}${t.settings.paymentInfo ? `\n\nRèglement : ${t.settings.paymentInfo}` : ''}${link}\n`)
    } else if (patch.status === 'refused' && reg.status !== 'refused') {
      await ctx.mailer.send(reg.email, `Inscription non retenue : ${t.name}`, `Bonjour,\n\nVotre inscription au tableau « ${from!.name} » de « ${t.name} » n'a pas été retenue.${note}${link}\n`)
    } else if (patch.status === 'waitlist' && reg.status !== 'waitlist') {
      await ctx.mailer.send(reg.email, `Liste d'attente : ${t.name}`, `Bonjour,\n\nVotre inscription au tableau « ${to.name} » de « ${t.name} » est en liste d'attente.${note}${link}\n`)
    } else if (moved) {
      await ctx.mailer.send(reg.email, `Changement de tableau : ${t.name}`, `Bonjour,${moved}${note}${link}\n`)
    }
  }
  return { reg: u!, tournamentId: reg.tournamentId, from: from!, to }
}
