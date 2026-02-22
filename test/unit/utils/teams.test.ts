import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildTeam } from '../../../server/test/factories/builds'

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

import { getTeamById, getTeamsByTournamentId, getTeamsByCategoryId, createTeam, updateTeam, deleteTeam } from '../../../server/utils/teams'

describe('teams utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getTeamById', () => {
    it('returns team when found', async () => {
      const team = buildTeam()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([team])
      expect(await getTeamById(team.id)).toEqual(team)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getTeamById('x')).toBeUndefined()
    })
  })

  describe('getTeamsByTournamentId', () => {
    it('returns teams for tournament', async () => {
      const teams = [buildTeam(), buildTeam()]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(teams)
      expect(await getTeamsByTournamentId('t-1')).toEqual(teams)
    })

    it('returns empty array when none', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      expect(await getTeamsByTournamentId('t-1')).toEqual([])
    })
  })

  describe('getTeamsByCategoryId', () => {
    it('returns teams for category', async () => {
      const teams = [buildTeam()]
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce(teams)
      expect(await getTeamsByCategoryId('c-1')).toEqual(teams)
    })
  })

  describe('createTeam', () => {
    it('creates team', async () => {
      const team = buildTeam()
      returningFn.mockResolvedValueOnce([team])
      const result = await createTeam({ name: 'A', playerOneId: 'p1', tournamentId: 't1', categoryId: 'c1' })
      expect(result).toEqual(team)
    })

    it('creates team with optional fields', async () => {
      const team = buildTeam({ seed: 1 })
      returningFn.mockResolvedValueOnce([team])
      const result = await createTeam({ name: 'B', playerOneId: 'p1', playerTwoId: 'p2', tournamentId: 't1', categoryId: 'c1', seed: 1 })
      expect(result).toEqual(team)
    })
  })

  describe('updateTeam', () => {
    it('updates team', async () => {
      const updated = buildTeam({ name: 'Updated' })
      returningFn.mockResolvedValueOnce([updated])
      expect(await updateTeam('t-1', { name: 'Updated' })).toEqual(updated)
      expect(setFn).toHaveBeenCalledWith({ name: 'Updated' })
    })
  })

  describe('deleteTeam', () => {
    it('deletes team', async () => {
      const deleted = buildTeam()
      returningFn.mockResolvedValueOnce([deleted])
      expect(await deleteTeam(deleted.id)).toEqual(deleted)
    })
  })
})
