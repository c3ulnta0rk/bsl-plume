import { z } from "zod";

export const REGISTRATION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export type RegistrationStatus =
  (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

const registrationStatusValues = Object.values(REGISTRATION_STATUS) as [
  RegistrationStatus,
  ...RegistrationStatus[],
];

export const registrationSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  partnerId: z.string().uuid().nullable(),
  partnerEmail: z.string().email().nullable(),
  status: z.enum(registrationStatusValues),
  registeredAt: z.date(),
});

export const createRegistrationSchema = z
  .object({
    playerId: z.string().uuid(),
    categoryId: z.string().uuid(),
    partnerId: z.string().uuid().nullable().optional(),
    partnerEmail: z.string().email().nullable().optional(),
  })
  .refine(
    (data) => {
      // If partner info provided, at least one must be present
      if (data.partnerId || data.partnerEmail) return true;
      return true;
    },
    {
      message: "Partner ID or partner email is required for doubles",
    },
  );

export type Registration = z.infer<typeof registrationSchema>;
export type CreateRegistration = z.infer<typeof createRegistrationSchema>;
