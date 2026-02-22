import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildMatch } from '../../../server/test/factories/builds'

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

import { getMatchById, getMatchesByPhaseId, getMatchesByPoolId, createMatch, updateMatch, deleteMatch } from '../../../server/utils/matches'

describe('matches utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getMatchById', () => {
    it('returns match when found', async () => {
      const match = buildMatch()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([match])
      expect(await getMatchById(match.id)).toEqual(match)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getMatchById('x')).toBeUndefined()
    })
  })

  describe('getMatchesByPhaseId', () => {
    it('returns matches for phase', async () => {
      const matches = [buildMatch(), buildMatch()]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(matches)
      expect(await getMatchesByPhaseId('ph-1')).toEqual(matches)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getMatchesByPhaseId('ph-1')).toEqual([])
    })
  })

  describe('getMatchesByPoolId', () => {
    it('returns matches for pool', async () => {
      const matches = [buildMatch({ poolId: 'pool-1' })]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(matches)
      expect(await getMatchesByPoolId('pool-1')).toEqual(matches)
    })
  })

  describe('createMatch', () => {
    it('creates match with all fields', async () => {
      const match = buildMatch({ team1Id: 't1', team2Id: 't2', round: 1 })
      returningFn.mockResolvedValueOnce([match])
      const result = await createMatch({ phaseId: 'ph-1', team1Id: 't1', team2Id: 't2', round: 1 })
      expect(result).toEqual(match)
    })

    it('creates match with minimal fields', async () => {
      const match = buildMatch()
      returningFn.mockResolvedValueOnce([match])
      const result = await createMatch({ phaseId: 'ph-1' })
      expect(result).toEqual(match)
    })
  })

  describe('updateMatch', () => {
    it('updates match', async () => {
      const updated = buildMatch({ status: 'completed', winnerId: 't1' })
      returningFn.mockResolvedValueOnce([updated])
      expect(await updateMatch('m-1', { status: 'completed', winnerId: 't1' })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ status: 'completed', winnerId: 't1' })
    })
  })

  describe('deleteMatch', () => {
    it('deletes match', async () => {
      const deleted = buildMatch()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deleteMatch(deleted.id)).toEqual(deleted)
    })
  })
})
