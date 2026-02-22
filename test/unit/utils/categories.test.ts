import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildCategoryType, buildCategory } from '../../../server/test/factories/builds'

const { mockDb, returningFn, selectWhereFn, fromFn, valuesFn, setFn, updateWhereFn, deleteWhereFn } = vi.hoisted(() => {
  const returningFn = vi.fn()
  const valuesFn = vi.fn(() => ({ returning: returningFn }))
  const updateWhereFn = vi.fn(() => ({ returning: returningFn }))
  const setFn = vi.fn(() => ({ where: updateWhereFn }))
  const deleteWhereFn = vi.fn(() => ({ returning: returningFn }))
  const selectWhereFn = vi.fn()
  const fromFn = vi.fn()
  const mockDb = {
    select: vi.fn(() => ({ from: fromFn })),
    insert: vi.fn(() => ({ values: valuesFn })),
    update: vi.fn(() => ({ set: setFn })),
    delete: vi.fn(() => ({ where: deleteWhereFn })),
  }
  return { mockDb, returningFn, valuesFn, setFn, updateWhereFn, deleteWhereFn, selectWhereFn, fromFn }
})

vi.mock('@nuxthub/db', () => ({ db: mockDb }))

import {
  getCategoryTypes, getCategoryTypeById, createCategoryType, updateCategoryType, deleteCategoryType,
  getCategories, getCategoriesByTournamentId, getCategoryById, createCategory, updateCategory, deleteCategory,
} from '../../../server/utils/categories'
import { categoryTypes, categories } from '../../../server/db/schema/categories'

describe('category utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- CategoryType ---

  describe('getCategoryTypes', () => {
    it('returns all category types', async () => {
      const types = [buildCategoryType(), buildCategoryType()]
      const selectResult = Object.assign(Promise.resolve(types), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getCategoryTypes()
      expect(result).toEqual(types)
      expect(fromFn).toHaveBeenCalledWith(categoryTypes)
    })
  })

  describe('getCategoryTypeById', () => {
    it('returns category type when found', async () => {
      const ct = buildCategoryType({ id: 'ct-1' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([ct])

      const result = await getCategoryTypeById('ct-1')
      expect(result).toEqual(ct)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      const result = await getCategoryTypeById('nope')
      expect(result).toBeUndefined()
    })
  })

  describe('createCategoryType', () => {
    it('creates a category type', async () => {
      const ct = buildCategoryType({ name: 'Simple Homme', type: 'singles', gender: 'M' })
      returningFn.mockResolvedValueOnce([ct])

      const result = await createCategoryType({ name: 'Simple Homme', type: 'singles', gender: 'M' })
      expect(result).toEqual(ct)
      expect(mockDb.insert).toHaveBeenCalledWith(categoryTypes)
    })
  })

  describe('updateCategoryType', () => {
    it('updates category type', async () => {
      const updated = buildCategoryType({ id: 'ct-1', name: 'Updated' })
      returningFn.mockResolvedValueOnce([updated])

      const result = await updateCategoryType('ct-1', { name: 'Updated' })
      expect(result).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ name: 'Updated' })
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      const result = await updateCategoryType('nope', { name: 'X' })
      expect(result).toBeUndefined()
    })
  })

  describe('deleteCategoryType', () => {
    it('deletes category type', async () => {
      const deleted = buildCategoryType({ id: 'ct-1' })
      returningFn.mockResolvedValueOnce([deleted])

      const result = await deleteCategoryType('ct-1')
      expect(result).toEqual(deleted)
    })
  })

  // --- Category ---

  describe('getCategories', () => {
    it('returns all categories', async () => {
      const cats = [buildCategory(), buildCategory()]
      const selectResult = Object.assign(Promise.resolve(cats), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getCategories()
      expect(result).toEqual(cats)
      expect(fromFn).toHaveBeenCalledWith(categories)
    })
  })

  describe('getCategoriesByTournamentId', () => {
    it('returns categories for tournament', async () => {
      const cats = [buildCategory({ tournamentId: 't-1' })]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(cats)

      const result = await getCategoriesByTournamentId('t-1')
      expect(result).toEqual(cats)
    })

    it('returns empty array when none found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      const result = await getCategoriesByTournamentId('t-1')
      expect(result).toEqual([])
    })
  })

  describe('getCategoryById', () => {
    it('returns category when found', async () => {
      const cat = buildCategory({ id: 'cat-1' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([cat])

      const result = await getCategoryById('cat-1')
      expect(result).toEqual(cat)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      const result = await getCategoryById('nope')
      expect(result).toBeUndefined()
    })
  })

  describe('createCategory', () => {
    it('creates a category', async () => {
      const cat = buildCategory({ tournamentId: 't-1', categoryTypeId: 'ct-1', maxTeams: 16 })
      returningFn.mockResolvedValueOnce([cat])

      const result = await createCategory({ tournamentId: 't-1', categoryTypeId: 'ct-1', maxTeams: 16 })
      expect(result).toEqual(cat)
      expect(mockDb.insert).toHaveBeenCalledWith(categories)
    })
  })

  describe('updateCategory', () => {
    it('updates category', async () => {
      const updated = buildCategory({ id: 'cat-1', status: 'open' })
      returningFn.mockResolvedValueOnce([updated])

      const result = await updateCategory('cat-1', { status: 'open' })
      expect(result).toEqual(updated)
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      const result = await updateCategory('nope', { status: 'open' })
      expect(result).toBeUndefined()
    })
  })

  describe('deleteCategory', () => {
    it('deletes category', async () => {
      const deleted = buildCategory({ id: 'cat-1' })
      returningFn.mockResolvedValueOnce([deleted])

      const result = await deleteCategory('cat-1')
      expect(result).toEqual(deleted)
    })
  })
})
