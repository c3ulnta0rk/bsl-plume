import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPool, buildPoolEntry } from '../../../server/test/factories/builds'

const { mockDb, returningFn, selectWhereFn, fromFn, valuesFn, setFn, deleteWhereFn } = vi.hoisted(() => {
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

import { getPoolById, getPoolsByPhaseId, createPool, deletePool, getPoolEntriesByPoolId, createPoolEntry, updatePoolEntry, deletePoolEntry } from '../../../server/utils/pools'

describe('pools utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // --- Pool ---

  describe('getPoolById', () => {
    it('returns pool when found', async () => {
      const pool = buildPool()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([pool])
      expect(await getPoolById(pool.id)).toEqual(pool)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getPoolById('x')).toBeUndefined()
    })
  })

  describe('getPoolsByPhaseId', () => {
    it('returns pools for phase', async () => {
      const pools = [buildPool({ name: 'A' }), buildPool({ name: 'B' })]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(pools)
      expect(await getPoolsByPhaseId('ph-1')).toEqual(pools)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getPoolsByPhaseId('ph-1')).toEqual([])
    })
  })

  describe('createPool', () => {
    it('creates pool', async () => {
      const pool = buildPool({ name: 'A' })
      returningFn.mockResolvedValueOnce([pool])
      const result = await createPool({ phaseId: 'ph-1', name: 'A' })
      expect(result).toEqual(pool)
    })
  })

  describe('deletePool', () => {
    it('deletes pool', async () => {
      const deleted = buildPool()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deletePool(deleted.id)).toEqual(deleted)
    })
  })

  // --- PoolEntry ---

  describe('getPoolEntriesByPoolId', () => {
    it('returns entries for pool', async () => {
      const entries = [buildPoolEntry(), buildPoolEntry()]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(entries)
      expect(await getPoolEntriesByPoolId('pool-1')).toEqual(entries)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getPoolEntriesByPoolId('pool-1')).toEqual([])
    })
  })

  describe('createPoolEntry', () => {
    it('creates pool entry', async () => {
      const entry = buildPoolEntry()
      returningFn.mockResolvedValueOnce([entry])
      const result = await createPoolEntry({ poolId: 'pool-1', teamId: 'team-1' })
      expect(result).toEqual(entry)
    })

    it('creates pool entry with finalRank', async () => {
      const entry = buildPoolEntry({ finalRank: 1 })
      returningFn.mockResolvedValueOnce([entry])
      const result = await createPoolEntry({ poolId: 'pool-1', teamId: 'team-1', finalRank: 1 })
      expect(result).toEqual(entry)
    })
  })

  describe('updatePoolEntry', () => {
    it('updates pool entry', async () => {
      const updated = buildPoolEntry({ finalRank: 2 })
      returningFn.mockResolvedValueOnce([updated])
      expect(await updatePoolEntry('pe-1', { finalRank: 2 })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ finalRank: 2 })
    })
  })

  describe('deletePoolEntry', () => {
    it('deletes pool entry', async () => {
      const deleted = buildPoolEntry()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deletePoolEntry(deleted.id)).toEqual(deleted)
    })
  })
})
