const PUBLIC_ROUTES = ['/api/auth/', '/api/hello', '/api/_hub/']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only protect /api/admin/* routes
  if (!path.startsWith('/api/admin/')) return

  // Skip public routes
  if (PUBLIC_ROUTES.some(r => path.startsWith(r))) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Write operations require admin role
  const method = event.node.req.method
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const user = session.user as { role?: string }
    if (user.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Forbidden: admin only' })
    }
  }
})
