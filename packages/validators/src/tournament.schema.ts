import { z } from "zod";

export const TOURNAMENT_STATUS = {
  DRAFT: "draft",
  REGISTRATION_OPEN: "registration_open",
  REGISTRATION_CLOSED: "registration_closed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type TournamentStatus =
  (typeof TOURNAMENT_STATUS)[keyof typeof TOURNAMENT_STATUS];

const tournamentStatusValues = Object.values(TOURNAMENT_STATUS) as [
  TournamentStatus,
  ...TournamentStatus[],
];

export const tournamentSchema = z.object({
  id: z.string().uuid(),
  clubId: z.string().uuid(),
  name: z.string().min(3).max(255),
  description: z.string().max(2000).nullable(),
  location: z.string().max(255).nullable(),
  startDate: z.date(),
  endDate: z.date(),
  registrationStart: z.date(),
  registrationEnd: z.date(),
  status: z.enum(tournamentStatusValues),
  settings: z
    .object({
      courtCount: z.number().int().min(1).max(50).optional(),
    })
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createTournamentSchema = tournamentSchema
  .omit({
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine((data) => data.registrationEnd <= data.startDate, {
    message: "Registration must end before tournament starts",
    path: ["registrationEnd"],
  })
  .refine((data) => data.registrationEnd > data.registrationStart, {
    message: "Registration end must be after registration start",
    path: ["registrationEnd"],
  });

export type Tournament = z.infer<typeof tournamentSchema>;
export type CreateTournament = z.input<typeof createTournamentSchema>;
