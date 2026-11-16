import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import type { ScoringRules, SetScore, SlotSource } from '@plume/engine'

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: createdAt()
})

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt()
})

/** Identité sportive d'une personne, commune à tous les tournois : c'est elle qui porte l'historique. */
export const players = pgTable('players', {
  id: id(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  licence: text('licence'),
  club: text('club'),
  gender: text('gender').$type<'M' | 'F' | null>(),
  email: text('email'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
}, t => [index('players_licence_idx').on(t.licence), index('players_email_idx').on(t.email)])

export interface TournamentSettings {
  /** Repos minimal entre deux matchs, en minutes. */
  restMinutes: number
  /** Texte libre affiché après validation (tarif, modalités de règlement…). Le site n'encaisse rien. */
  paymentInfo?: string
  contactEmail?: string
  registrationDeadline?: string | null
  /** Heure de début des matchs (ISO). */
  startTime?: string | null
  /** Pause en cours : aucun match lancé avant cette heure (ISO). */
  pausedUntil?: string | null
  federation?: 'FFBaD' | 'BWF' | 'Libre'
}

export type TournamentStatus = 'draft' | 'published' | 'running' | 'finished'

export const tournaments = pgTable('tournaments', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  clubName: text('club_name').notNull().default(''),
  location: text('location').notNull().default(''),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  description: text('description').notNull().default(''),
  rulesText: text('rules_text').notNull().default(''),
  status: text('status').$type<TournamentStatus>().notNull().default('draft'),
  registrationOpen: boolean('registration_open').notNull().default(true),
  settings: jsonb('settings').$type<TournamentSettings>().notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: createdAt()
})

export const staff = pgTable('staff', {
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').$type<'admin' | 'scorer'>().notNull()
}, t => [primaryKey({ columns: [t.tournamentId, t.userId] })])

export const courts = pgTable('courts', {
  id: id(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  open: boolean('open').notNull().default(true)
})

export type Discipline = 'SH' | 'SD' | 'DH' | 'DD' | 'DX'

export interface CategoryFormat {
  type: 'pools_bracket' | 'pools' | 'bracket'
  /** Taille de poule visée. */
  poolSize: number
  /** Qualifiés par poule pour le tableau final. */
  qualifiers: number
  thirdPlace: boolean
}

export type CategoryStatus = 'registration' | 'drawn' | 'finished'

export const categories = pgTable('categories', {
  id: id(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  discipline: text('discipline').$type<Discipline>().notNull(),
  level: text('level').notNull().default(''),
  maxEntries: integer('max_entries').notNull().default(16),
  position: integer('position').notNull().default(0),
  format: jsonb('format').$type<CategoryFormat>().notNull(),
  poolRules: jsonb('pool_rules').$type<ScoringRules>().notNull(),
  bracketRules: jsonb('bracket_rules').$type<ScoringRules>().notNull(),
  status: text('status').$type<CategoryStatus>().notNull().default('registration'),
  drawSeed: integer('draw_seed')
})

export type RegistrationStatus = 'pending_email' | 'pending' | 'accepted' | 'waitlist' | 'refused' | 'withdrawn'

/** Une inscription = un joueur (simple) ou une paire (double) dans une catégorie. */
export const registrations = pgTable('registrations', {
  id: id(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  player1Id: text('player1_id').notNull().references(() => players.id),
  player2Id: text('player2_id').references(() => players.id),
  email: text('email'),
  phone: text('phone'),
  note: text('note'),
  status: text('status').$type<RegistrationStatus>().notNull().default('pending_email'),
  source: text('source').$type<'online' | 'manual'>().notNull().default('online'),
  confirmToken: text('confirm_token'),
  seed: integer('seed'),
  /** Décision de l'organisateur (motif de refus, changement de tableau…). */
  organizerNote: text('organizer_note'),
  /** Retrait en cours de tournoi : annulation des résultats de poule ou forfaits sur les matchs restants. */
  withdrawMode: text('withdraw_mode').$type<'annul' | 'walkover' | null>(),
  createdAt: createdAt()
}, t => [index('reg_tournament_idx').on(t.tournamentId), index('reg_token_idx').on(t.confirmToken)])

export const pools = pgTable('pools', {
  id: id(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull()
})

export const poolEntries = pgTable('pool_entries', {
  poolId: text('pool_id').notNull().references(() => pools.id, { onDelete: 'cascade' }),
  registrationId: text('registration_id').notNull().references(() => registrations.id, { onDelete: 'cascade' }),
  position: integer('position').notNull()
}, t => [primaryKey({ columns: [t.poolId, t.registrationId] })])

export type MatchStatus = 'pending' | 'called' | 'playing' | 'completed' | 'cancelled'
export type MatchResultType = 'normal' | 'retired' | 'walkover' | 'bye'

export const matches = pgTable('matches', {
  id: id(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  phase: text('phase').$type<'pool' | 'bracket'>().notNull(),
  poolId: text('pool_id').references(() => pools.id, { onDelete: 'cascade' }),
  round: integer('round').notNull(),
  position: integer('position').notNull(),
  number: integer('number').notNull(),
  entry1Id: text('entry1_id').references(() => registrations.id, { onDelete: 'set null' }),
  entry2Id: text('entry2_id').references(() => registrations.id, { onDelete: 'set null' }),
  source1: jsonb('source1').$type<SlotSource | null>(),
  source2: jsonb('source2').$type<SlotSource | null>(),
  status: text('status').$type<MatchStatus>().notNull().default('pending'),
  courtId: text('court_id').references(() => courts.id, { onDelete: 'set null' }),
  calledAt: timestamp('called_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  sets: jsonb('sets').$type<SetScore[]>().notNull().default([]),
  winnerSide: integer('winner_side').$type<1 | 2 | null>(),
  resultType: text('result_type').$type<MatchResultType | null>(),
  /** Règles figées au moment du résultat, pour qu'un changement de format ne réécrive pas le passé. */
  rules: jsonb('rules').$type<ScoringRules | null>(),
  thirdPlace: boolean('third_place').notNull().default(false),
  nextMatchId: text('next_match_id'),
  nextSide: integer('next_side').$type<1 | 2 | null>(),
  loserNextMatchId: text('loser_next_match_id'),
  loserNextSide: integer('loser_next_side').$type<1 | 2 | null>()
}, t => [index('matches_tournament_idx').on(t.tournamentId), index('matches_category_idx').on(t.categoryId)])

/** Journal des décisions de l'organisateur : tout changement en cours de route y est tracé. */
export const journal = pgTable('journal', {
  id: id(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  type: text('type').notNull(),
  message: text('message').notNull(),
  createdAt: createdAt()
}, t => [index('journal_tournament_idx').on(t.tournamentId)])

/** Suivi d'un joueur par un appareil (spectateur sans compte) ou par le joueur lui-même. */
export const follows = pgTable('follows', {
  deviceId: text('device_id').notNull(),
  playerId: text('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  isMe: boolean('is_me').notNull().default(false),
  createdAt: createdAt()
}, t => [primaryKey({ columns: [t.deviceId, t.playerId] })])

export const pushSubscriptions = pgTable('push_subscriptions', {
  deviceId: text('device_id').primaryKey(),
  kind: text('kind').$type<'web' | 'expo'>().notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt()
})

export const notifications = pgTable('notifications', {
  id: id(),
  deviceId: text('device_id').notNull(),
  /** Clé d'unicité : un même événement n'est notifié qu'une fois par appareil. */
  key: text('key').notNull(),
  tournamentId: text('tournament_id'),
  matchId: text('match_id'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url'),
  createdAt: createdAt()
}, t => [uniqueIndex('notif_device_key').on(t.deviceId, t.key)])

export const outbox = pgTable('outbox', {
  id: id(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sent: boolean('sent').notNull().default(false),
  createdAt: createdAt()
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull()
})
