import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock h3 utilities
const mockGetRequestURL = vi.fn()
const mockGetUserSession = vi.fn()
const mockCreateError = vi.fn((opts: { statusCode: number, message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

vi.stubGlobal('getRequestURL', mockGetRequestURL)
vi.stubGlobal('getUserSession', mockGetUserSession)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('defineEventHandler', (fn: Function) => fn)

// Import the middleware handler (it's the function returned by defineEventHandler)
const middleware = await import('../../../server/middleware/auth')
const handler = middleware.default as (event: unknown) => Promise<void>

describe('server auth middleware', () => {
  const createEvent = (method = 'GET') => ({
    node: { req: { method }, res: {} },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips non-admin routes', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/hello'))

    const result = await handler(createEvent())
    expect(result).toBeUndefined()
    expect(mockGetUserSession).not.toHaveBeenCalled()
  })

  it('skips auth routes', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/auth/login'))

    const result = await handler(createEvent())
    expect(result).toBeUndefined()
    expect(mockGetUserSession).not.toHaveBeenCalled()
  })

  it('returns 401 for unauthenticated admin requests', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({})

    await expect(handler(createEvent())).rejects.toThrow('Unauthorized')
  })

  it('allows GET for authenticated user', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({ user: { id: '1', role: 'user' } })

    const result = await handler(createEvent('GET'))
    expect(result).toBeUndefined()
  })

  it('returns 403 for non-admin POST', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({ user: { id: '1', role: 'user' } })

    await expect(handler(createEvent('POST'))).rejects.toThrow('Forbidden: admin only')
  })

  it('allows POST for admin user', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({ user: { id: '1', role: 'admin' } })

    const result = await handler(createEvent('POST'))
    expect(result).toBeUndefined()
  })

  it('returns 403 for non-admin DELETE', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({ user: { id: '1', role: 'user' } })

    await expect(handler(createEvent('DELETE'))).rejects.toThrow('Forbidden: admin only')
  })

  it('allows DELETE for admin', async () => {
    mockGetRequestURL.mockReturnValue(new URL('http://localhost/api/admin/clubs'))
    mockGetUserSession.mockResolvedValue({ user: { id: '1', role: 'admin' } })

    const result = await handler(createEvent('DELETE'))
    expect(result).toBeUndefined()
  })
})
