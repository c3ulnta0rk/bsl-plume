export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteUser(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'User not found' })
  return deleted
})
