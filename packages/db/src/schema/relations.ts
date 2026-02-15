import { relations } from "drizzle-orm";
import { brackets } from "./brackets";
import { categories } from "./categories";
import { clubMemberships } from "./club-memberships";
import { clubs } from "./clubs";
import { courts } from "./courts";
import { matches } from "./matches";
import { players } from "./players";
import { poolEntries, pools } from "./pools";
import { registrations } from "./registrations";
import { tournaments } from "./tournaments";

export const clubsRelations = relations(clubs, ({ many }) => ({
  tournaments: many(tournaments),
  memberships: many(clubMemberships),
}));

export const clubMembershipsRelations = relations(
  clubMemberships,
  ({ one }) => ({
    club: one(clubs, {
      fields: [clubMemberships.clubId],
      references: [clubs.id],
    }),
  }),
);

export const tournamentsRelations = relations(
  tournaments,
  ({ one, many }) => ({
    club: one(clubs, {
      fields: [tournaments.clubId],
      references: [clubs.id],
    }),
    categories: many(categories),
    courts: many(courts),
  }),
);

export const categoriesRelations = relations(
  categories,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [categories.tournamentId],
      references: [tournaments.id],
    }),
    registrations: many(registrations),
    pools: many(pools),
    brackets: many(brackets),
  }),
);

export const playersRelations = relations(players, ({ many }) => ({
  registrations: many(registrations),
  poolEntries: many(poolEntries),
}));

export const registrationsRelations = relations(
  registrations,
  ({ one }) => ({
    player: one(players, {
      fields: [registrations.playerId],
      references: [players.id],
    }),
    category: one(categories, {
      fields: [registrations.categoryId],
      references: [categories.id],
    }),
    partner: one(players, {
      fields: [registrations.partnerId],
      references: [players.id],
    }),
  }),
);

export const poolsRelations = relations(pools, ({ one, many }) => ({
  category: one(categories, {
    fields: [pools.categoryId],
    references: [categories.id],
  }),
  entries: many(poolEntries),
  matches: many(matches),
}));

export const poolEntriesRelations = relations(
  poolEntries,
  ({ one }) => ({
    pool: one(pools, {
      fields: [poolEntries.poolId],
      references: [pools.id],
    }),
    player: one(players, {
      fields: [poolEntries.playerId],
      references: [players.id],
    }),
  }),
);

export const bracketsRelations = relations(
  brackets,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [brackets.categoryId],
      references: [categories.id],
    }),
    matches: many(matches),
  }),
);

export const matchesRelations = relations(matches, ({ one }) => ({
  pool: one(pools, {
    fields: [matches.poolId],
    references: [pools.id],
  }),
  bracket: one(brackets, {
    fields: [matches.bracketId],
    references: [brackets.id],
  }),
}));

export const courtsRelations = relations(courts, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [courts.tournamentId],
    references: [tournaments.id],
  }),
  currentMatch: one(matches, {
    fields: [courts.currentMatchId],
    references: [matches.id],
  }),
}));
