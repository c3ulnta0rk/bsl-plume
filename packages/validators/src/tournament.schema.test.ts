import { describe, expect, it } from "vitest";
import { createTournamentSchema, TOURNAMENT_STATUS, tournamentSchema } from "./tournament.schema";

describe("tournamentSchema", () => {
  it("should validate a complete tournament", () => {
    const result = tournamentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Open de Rimouski 2026",
      description: "Tournoi annuel",
      location: "Centre sportif de Rimouski",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      status: TOURNAMENT_STATUS.DRAFT,
      settings: { courtCount: 6 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("should reject a name shorter than 3 characters", () => {
    const result = tournamentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "AB",
      startDate: new Date(),
      endDate: new Date(),
      registrationStart: new Date(),
      registrationEnd: new Date(),
      status: "draft",
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid status", () => {
    const result = tournamentSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Valid Name",
      startDate: new Date(),
      endDate: new Date(),
      registrationStart: new Date(),
      registrationEnd: new Date(),
      status: "invalid_status",
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(false);
  });
});

describe("createTournamentSchema", () => {
  it("should validate tournament creation data", () => {
    const result = createTournamentSchema.safeParse({
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Open de Rimouski 2026",
      description: null,
      location: "Centre sportif",
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      settings: null,
    });
    expect(result.success).toBe(true);
  });

  it("should reject when end date is before start date", () => {
    const result = createTournamentSchema.safeParse({
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Open de Rimouski 2026",
      description: null,
      location: null,
      startDate: new Date("2026-04-16"),
      endDate: new Date("2026-04-15"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-10"),
      settings: null,
    });
    expect(result.success).toBe(false);
  });

  it("should reject when registration ends after tournament starts", () => {
    const result = createTournamentSchema.safeParse({
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Open de Rimouski 2026",
      description: null,
      location: null,
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-03-01"),
      registrationEnd: new Date("2026-04-16"),
      settings: null,
    });
    expect(result.success).toBe(false);
  });

  it("should reject when registration end is before registration start", () => {
    const result = createTournamentSchema.safeParse({
      clubId: "550e8400-e29b-41d4-a716-446655440001",
      name: "Open de Rimouski 2026",
      description: null,
      location: null,
      startDate: new Date("2026-04-15"),
      endDate: new Date("2026-04-16"),
      registrationStart: new Date("2026-04-01"),
      registrationEnd: new Date("2026-03-01"),
      settings: null,
    });
    expect(result.success).toBe(false);
  });
});
