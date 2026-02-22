import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildClub } from '../../../server/test/factories/builds'

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

import { getClubs, getClubById, createClub, updateClub, deleteClub } from '../../../server/utils/clubs'
import { clubs } from '../../../server/db/schema/clubs'

describe('clubs utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClubs', () => {
    it('returns all clubs', async () => {
      const club1 = buildClub({ name: 'Club A' })
      const club2 = buildClub({ name: 'Club B' })
      const selectResult = Object.assign(Promise.resolve([club1, club2]), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getClubs()

      expect(result).toEqual([club1, club2])
      expect(fromFn).toHaveBeenCalledWith(clubs)
    })

    it('returns empty array when no clubs exist', async () => {
      const selectResult = Object.assign(Promise.resolve([]), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getClubs()
      expect(result).toEqual([])
    })
  })

  describe('getClubById', () => {
    it('returns club when found', async () => {
      const club = buildClub({ id: 'club-1' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([club])

      const result = await getClubById('club-1')
      expect(result).toEqual(club)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      const result = await getClubById('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('createClub', () => {
    it('creates a new club', async () => {
      const newClub = buildClub({ name: 'New Club' })
      returningFn.mockResolvedValueOnce([newClub])

      const result = await createClub({ name: 'New Club' })

      expect(result).toEqual(newClub)
      expect(mockDb.insert).toHaveBeenCalledWith(clubs)
      expect(valuesFn).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Club' }))
    })
  })

  describe('updateClub', () => {
    it('updates club data', async () => {
      const updated = buildClub({ id: 'club-1', name: 'Updated' })
      returningFn.mockResolvedValueOnce([updated])

      const result = await updateClub('club-1', { name: 'Updated' })

      expect(result).toEqual(updated)
      expect(mockDb.update).toHaveBeenCalledWith(clubs)
      expect(setFn).toHaveBeenCalledWith({ name: 'Updated' })
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      const result = await updateClub('non-existent', { name: 'X' })
      expect(result).toBeUndefined()
    })
  })

  describe('deleteClub', () => {
    it('deletes a club', async () => {
      const deleted = buildClub({ id: 'club-1' })
      returningFn.mockResolvedValueOnce([deleted])

      const result = await deleteClub('club-1')
      expect(result).toEqual(deleted)
      expect(mockDb.delete).toHaveBeenCalledWith(clubs)
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      const result = await deleteClub('non-existent')
      expect(result).toBeUndefined()
    })
  })
})
