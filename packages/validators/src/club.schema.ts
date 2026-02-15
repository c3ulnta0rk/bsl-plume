import { z } from "zod";

export const clubSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  logoUrl: z.string().url().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  description: z.string().max(500).nullable(),
  location: z.string().max(200).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createClubSchema = clubSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Club = z.infer<typeof clubSchema>;
export type CreateClub = z.infer<typeof createClubSchema>;
