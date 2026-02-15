import { z } from "zod";

export const CATEGORY_TYPE = {
  SH: "SH",
  SD: "SD",
  DH: "DH",
  DD: "DD",
  DX: "DX",
} as const;

export type CategoryType =
  (typeof CATEGORY_TYPE)[keyof typeof CATEGORY_TYPE];

export const CATEGORY_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type CategoryStatus =
  (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS];

const categoryTypeValues = Object.values(CATEGORY_TYPE) as [
  CategoryType,
  ...CategoryType[],
];

const categoryStatusValues = Object.values(CATEGORY_STATUS) as [
  CategoryStatus,
  ...CategoryStatus[],
];

export const categorySchema = z.object({
  id: z.string().uuid(),
  tournamentId: z.string().uuid(),
  type: z.enum(categoryTypeValues),
  maxPlayers: z.number().int().min(2).max(256),
  status: z.enum(categoryStatusValues),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createCategorySchema = categorySchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type Category = z.infer<typeof categorySchema>;
export type CreateCategory = z.infer<typeof createCategorySchema>;
