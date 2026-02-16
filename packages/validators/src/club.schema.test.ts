import { describe, expect, it } from "vitest";
import { clubSchema, createClubSchema } from "./club.schema";

const validClub = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "BSL Badminton",
  slug: "bsl-badminton",
  logoUrl: null,
  primaryColor: "#1a2b3c",
  secondaryColor: null,
  description: null,
  location: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("clubSchema", () => {
  it("should validate a complete club", () => {
    const result = clubSchema.safeParse(validClub);
    expect(result.success).toBe(true);
  });

  it("should reject a name shorter than 2 characters", () => {
    const result = clubSchema.safeParse({ ...validClub, name: "A" });
    expect(result.success).toBe(false);
  });

  it("should reject a slug with uppercase letters", () => {
    const result = clubSchema.safeParse({ ...validClub, slug: "Bad-Slug" });
    expect(result.success).toBe(false);
  });

  it("should reject a slug with spaces", () => {
    const result = clubSchema.safeParse({ ...validClub, slug: "bad slug" });
    expect(result.success).toBe(false);
  });

  it("should accept a valid hex primaryColor", () => {
    const result = clubSchema.safeParse({
      ...validClub,
      primaryColor: "#ff00aa",
    });
    expect(result.success).toBe(true);
  });

  it("should reject an invalid primaryColor", () => {
    const result = clubSchema.safeParse({
      ...validClub,
      primaryColor: "red",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid logoUrl", () => {
    const result = clubSchema.safeParse({
      ...validClub,
      logoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a description longer than 500 characters", () => {
    const result = clubSchema.safeParse({
      ...validClub,
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should accept null for nullable fields", () => {
    const result = clubSchema.safeParse({
      ...validClub,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      description: null,
      location: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("createClubSchema", () => {
  it("should validate creation data without id and timestamps", () => {
    const result = createClubSchema.safeParse({
      name: "BSL Badminton",
      slug: "bsl-badminton",
      logoUrl: null,
      primaryColor: "#1a2b3c",
      secondaryColor: null,
      description: null,
      location: null,
    });
    expect(result.success).toBe(true);
  });
});
