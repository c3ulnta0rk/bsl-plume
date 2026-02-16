import { describe, expect, it } from "vitest";
import {
  categorySchema,
  createCategorySchema,
  CATEGORY_TYPE,
  CATEGORY_STATUS,
} from "./category.schema";

const validCategory = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  tournamentId: "550e8400-e29b-41d4-a716-446655440001",
  type: CATEGORY_TYPE.SH,
  maxPlayers: 32,
  status: CATEGORY_STATUS.OPEN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("categorySchema", () => {
  it("should validate a complete category", () => {
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it.each(Object.values(CATEGORY_TYPE))(
    "should accept category type %s",
    (type) => {
      const result = categorySchema.safeParse({ ...validCategory, type });
      expect(result.success).toBe(true);
    },
  );

  it("should reject an invalid UUID", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid type", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxPlayers less than 2", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      maxPlayers: 1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxPlayers greater than 256", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      maxPlayers: 257,
    });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid status", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("should validate creation data without id, status, and timestamps", () => {
    const result = createCategorySchema.safeParse({
      tournamentId: "550e8400-e29b-41d4-a716-446655440001",
      type: CATEGORY_TYPE.DX,
      maxPlayers: 16,
    });
    expect(result.success).toBe(true);
  });

  it("should require tournamentId", () => {
    const result = createCategorySchema.safeParse({
      type: CATEGORY_TYPE.SH,
      maxPlayers: 16,
    });
    expect(result.success).toBe(false);
  });
});
