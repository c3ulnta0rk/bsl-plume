import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPhase } from '../../../server/test/factories/builds'

const { mockDb, returningFn, selectWhereFn, fromFn, setFn } = vi.hoisted(() => {
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

import { getPhaseById, getPhasesByCategoryId, createPhase, updatePhase, deletePhase } from '../../../server/utils/phases'

describe('phases utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getPhaseById', () => {
    it('returns phase when found', async () => {
      const phase = buildPhase()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([phase])
      expect(await getPhaseById(phase.id)).toEqual(phase)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getPhaseById('x')).toBeUndefined()
    })
  })

  describe('getPhasesByCategoryId', () => {
    it('returns phases for category', async () => {
      const phases = [buildPhase(), buildPhase()]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(phases)
      expect(await getPhasesByCategoryId('c-1')).toEqual(phases)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getPhasesByCategoryId('c-1')).toEqual([])
    })
  })

  describe('createPhase', () => {
    it('creates phase', async () => {
      const phase = buildPhase({ type: 'pool', name: 'Poules' })
      returningFn.mockResolvedValueOnce([phase])
      const result = await createPhase({ categoryId: 'c-1', name: 'Poules', type: 'pool', phaseOrder: 1, config: {} })
      expect(result).toEqual(phase)
    })
  })

  describe('updatePhase', () => {
    it('updates phase', async () => {
      const updated = buildPhase({ status: 'completed' })
      returningFn.mockResolvedValueOnce([updated])
      expect(await updatePhase('p-1', { status: 'completed' })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ status: 'completed' })
    })
  })

  describe('deletePhase', () => {
    it('deletes phase', async () => {
      const deleted = buildPhase()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deletePhase(deleted.id)).toEqual(deleted)
    })
  })
})
