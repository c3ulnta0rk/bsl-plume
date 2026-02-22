export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const deleted = await deleteMatch(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Match not found' })
  return deleted
})
