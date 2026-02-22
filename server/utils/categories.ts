import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import type { CategoryType, Category } from '../db/schema/categories'
import { categoryTypes, categories } from '../db/schema/categories'

// --- CategoryType CRUD ---

export async function getCategoryTypes() {
  return db.select().from(categoryTypes)
}

export async function getCategoryTypeById(id: string) {
  const rows = await db.select().from(categoryTypes).where(eq(categoryTypes.id, id))
  return rows[0] ?? undefined
}

export async function createCategoryType(data: { name: string, type: string, gender?: string | null }) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(categoryTypes).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateCategoryType(id: string, data: Partial<CategoryType>) {
  const [updated] = await db.update(categoryTypes).set(data).where(eq(categoryTypes.id, id)).returning()
  return updated ?? undefined
}

export async function deleteCategoryType(id: string) {
  const result = await db.delete(categoryTypes).where(eq(categoryTypes.id, id)).returning()
  return result[0] ?? undefined
}

// --- Category CRUD ---

export async function getCategories() {
  return db.select().from(categories)
}

export async function getCategoriesByTournamentId(tournamentId: string) {
  return db.select().from(categories).where(eq(categories.tournamentId, tournamentId))
}

export async function getCategoryById(id: string) {
  const rows = await db.select().from(categories).where(eq(categories.id, id))
  return rows[0] ?? undefined
}

export async function createCategory(data: {
  tournamentId: string
  categoryTypeId: string
  maxTeams?: number | null
  status?: string
}) {
  const id = crypto.randomUUID()
  const [inserted] = await db.insert(categories).values({ ...data, id }).returning()
  return inserted ?? undefined
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning()
  return updated ?? undefined
}

export async function deleteCategory(id: string) {
  const result = await db.delete(categories).where(eq(categories.id, id)).returning()
  return result[0] ?? undefined
}
