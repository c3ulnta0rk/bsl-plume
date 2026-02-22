import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTournament } from '../../../server/test/factories/builds'

const { mockDb, returningFn, selectWhereFn, fromFn, valuesFn, setFn } = vi.hoisted(() => {
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

import { getTournaments, getTournamentById, createTournament, updateTournament, deleteTournament } from '../../../server/utils/tournaments'

describe('tournaments utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getTournaments', () => {
    it('returns all tournaments', async () => {
      const tournaments = [buildTournament(), buildTournament()]
      const selectResult = Object.assign(Promise.resolve(tournaments), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      expect(await getTournaments()).toEqual(tournaments)
    })

    it('returns empty array when none', async () => {
      const selectResult = Object.assign(Promise.resolve([]), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      expect(await getTournaments()).toEqual([])
    })
  })

  describe('getTournamentById', () => {
    it('returns tournament when found', async () => {
      const t = buildTournament()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([t])

      expect(await getTournamentById(t.id)).toEqual(t)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      expect(await getTournamentById('x')).toBeUndefined()
    })
  })

  describe('createTournament', () => {
    it('creates tournament', async () => {
      const t = buildTournament({ name: 'New', clubId: 'c-1' })
      returningFn.mockResolvedValueOnce([t])

      const result = await createTournament({ name: 'New', clubId: 'c-1' })
      expect(result).toEqual(t)
      expect(valuesFn).toHaveBeenCalledWith(expect.objectContaining({ name: 'New', clubId: 'c-1' }))
    })

    it('returns undefined when insert fails', async () => {
      returningFn.mockResolvedValueOnce([])
      const result = await createTournament({ name: 'Fail', clubId: 'c-1' })
      expect(result).toBeUndefined()
    })
  })

  describe('updateTournament', () => {
    it('updates tournament', async () => {
      const updated = buildTournament({ name: 'Updated' })
      returningFn.mockResolvedValueOnce([updated])

      expect(await updateTournament('t-1', { name: 'Updated' })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ name: 'Updated' })
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      expect(await updateTournament('x', { name: 'X' })).toBeUndefined()
    })
  })

  describe('deleteTournament', () => {
    it('deletes tournament', async () => {
      const deleted = buildTournament()
      returningFn.mockResolvedValueOnce([deleted])

      expect(await deleteTournament(deleted.id)).toEqual(deleted)
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      expect(await deleteTournament('x')).toBeUndefined()
    })
  })
})
