import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSet } from '../../../server/test/factories/builds'

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

import { getSetsByMatchId, createSet, updateSet, deleteSet } from '../../../server/utils/sets'

describe('sets utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getSetsByMatchId', () => {
    it('returns sets for match', async () => {
      const sets = [buildSet({ setNumber: 1 }), buildSet({ setNumber: 2 })]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(sets)
      expect(await getSetsByMatchId('m-1')).toEqual(sets)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getSetsByMatchId('m-1')).toEqual([])
    })
  })

  describe('createSet', () => {
    it('creates set with scores', async () => {
      const s = buildSet({ score1: 21, score2: 19 })
      returningFn.mockResolvedValueOnce([s])
      const result = await createSet({ matchId: 'm-1', setNumber: 1, score1: 21, score2: 19 })
      expect(result).toEqual(s)
    })

    it('creates set without scores', async () => {
      const s = buildSet()
      returningFn.mockResolvedValueOnce([s])
      const result = await createSet({ matchId: 'm-1', setNumber: 1 })
      expect(result).toEqual(s)
    })
  })

  describe('updateSet', () => {
    it('updates set scores', async () => {
      const updated = buildSet({ score1: 21, score2: 18 })
      returningFn.mockResolvedValueOnce([updated])
      expect(await updateSet('s-1', { score1: 21, score2: 18 })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ score1: 21, score2: 18 })
    })
  })

  describe('deleteSet', () => {
    it('deletes set', async () => {
      const deleted = buildSet()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deleteSet(deleted.id)).toEqual(deleted)
    })
  })
})
