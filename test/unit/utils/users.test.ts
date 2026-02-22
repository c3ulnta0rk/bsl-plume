import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildUser } from '../../../server/test/factories/builds'

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

import { getUsers, getUserByEmail, createUser, getUserById, updateUser, deleteUser } from '../../../server/utils/users'

describe('users utils', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getUsers', () => {
    it('returns all users', async () => {
      const user1 = buildUser({ name: 'User A' })
      const user2 = buildUser({ name: 'User B' })
      const selectResult = Object.assign(Promise.resolve([user1, user2]), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getUsers()
      expect(result).toEqual([user1, user2])
    })

    it('returns empty array when no users', async () => {
      const selectResult = Object.assign(Promise.resolve([]), { where: selectWhereFn })
      fromFn.mockReturnValueOnce(selectResult)

      const result = await getUsers()
      expect(result).toEqual([])
    })
  })

  describe('getUserByEmail', () => {
    it('returns user when found', async () => {
      const user = buildUser({ email: 'test@example.com' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([user])

      expect(await getUserByEmail('test@example.com')).toEqual(user)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      expect(await getUserByEmail('nope@example.com')).toBeUndefined()
    })

    it('normalizes email (trim + lowercase)', async () => {
      const user = buildUser({ email: 'test@example.com' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([user])

      const result = await getUserByEmail('  TEST@EXAMPLE.COM  ')
      expect(result).toEqual(user)
    })
  })

  describe('createUser', () => {
    it('creates user when email not taken', async () => {
      const newUser = buildUser({ email: 'new@example.com' })
      // getUserByEmail check: no existing user
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      // insert
      returningFn.mockResolvedValueOnce([newUser])

      const result = await createUser('new@example.com', 'New User', 'hash123')
      expect(result).toEqual(newUser)
    })

    it('throws USER_EXISTS when email taken', async () => {
      const existing = buildUser({ email: 'taken@example.com' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([existing])

      await expect(createUser('taken@example.com', 'X', 'hash')).rejects.toThrow('USER_EXISTS')
    })

    it('normalizes email before checking', async () => {
      const newUser = buildUser({ email: 'test@example.com' })
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])
      returningFn.mockResolvedValueOnce([newUser])

      await createUser('  TEST@EXAMPLE.COM  ', 'User', 'hash')
      expect(valuesFn).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }))
    })
  })

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const user = buildUser()
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([user])

      expect(await getUserById(user.id)).toEqual(user)
    })

    it('returns undefined when not found', async () => {
      fromFn.mockReturnValueOnce({ where: selectWhereFn })
      selectWhereFn.mockResolvedValueOnce([])

      expect(await getUserById('x')).toBeUndefined()
    })
  })

  describe('updateUser', () => {
    it('updates user', async () => {
      const updated = buildUser({ name: 'Updated' })
      returningFn.mockResolvedValueOnce([updated])

      expect(await updateUser(updated.id, { name: 'Updated' })).toEqual(updated)
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      expect(await updateUser('x', { name: 'X' })).toBeUndefined()
    })
  })

  describe('deleteUser', () => {
    it('deletes user', async () => {
      const deleted = buildUser()
      returningFn.mockResolvedValueOnce([deleted])

      expect(await deleteUser(deleted.id)).toEqual(deleted)
    })

    it('returns undefined when not found', async () => {
      returningFn.mockResolvedValueOnce([])
      expect(await deleteUser('x')).toBeUndefined()
    })
  })
})
