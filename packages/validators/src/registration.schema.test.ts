import { describe, expect, it } from "vitest";
import {
  registrationSchema,
  createRegistrationSchema,
  REGISTRATION_STATUS,
} from "./registration.schema";

const validRegistration = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  playerId: "550e8400-e29b-41d4-a716-446655440001",
  categoryId: "550e8400-e29b-41d4-a716-446655440002",
  partnerId: null,
  partnerEmail: null,
  status: REGISTRATION_STATUS.PENDING,
  registeredAt: new Date(),
};

describe("registrationSchema", () => {
  it("should validate a complete registration", () => {
    const result = registrationSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it.each(Object.values(REGISTRATION_STATUS))(
    "should accept status %s",
    (status) => {
      const result = registrationSchema.safeParse({
        ...validRegistration,
        status,
      });
      expect(result.success).toBe(true);
    },
  );

  it("should accept a valid partnerId", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      partnerId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });

  it("should accept a valid partnerEmail", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      partnerEmail: "partner@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an invalid UUID for playerId", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      playerId: "bad-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid email", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      partnerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid status", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("createRegistrationSchema", () => {
  it("should validate minimal creation data", () => {
    const result = createRegistrationSchema.safeParse({
      playerId: "550e8400-e29b-41d4-a716-446655440001",
      categoryId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.success).toBe(true);
  });

  it("should validate with partnerId", () => {
    const result = createRegistrationSchema.safeParse({
      playerId: "550e8400-e29b-41d4-a716-446655440001",
      categoryId: "550e8400-e29b-41d4-a716-446655440002",
      partnerId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });

  it("should validate with partnerEmail", () => {
    const result = createRegistrationSchema.safeParse({
      playerId: "550e8400-e29b-41d4-a716-446655440001",
      categoryId: "550e8400-e29b-41d4-a716-446655440002",
      partnerEmail: "partner@example.com",
    });
    expect(result.success).toBe(true);
  });
});
